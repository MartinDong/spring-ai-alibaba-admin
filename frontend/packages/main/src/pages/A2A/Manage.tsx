import CardList from '@/components/Card/List';
import { useInnerLayout } from '@/components/InnerLayout/utils';
import $i18n from '@/i18n';
import {
  deleteA2aAgent,
  listA2aAgents,
  listA2aPublications,
  unpublishA2a,
} from '@/services/a2a';
import {
  IA2aPublication,
  IA2aRemoteAgent,
  IPagingList,
} from '@/types/a2a';
import {
  AlertDialog,
  Button,
  ButtonProps,
  IconFont,
  message,
} from '@spark-ai/design';
import { useMount, useSetState } from 'ahooks';
import { Flex, Table, Tabs } from 'antd';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { history } from 'umi';
import A2aCard from './components/A2aCard';
import styles from './Manage.module.less';

export const CreateA2aBtn = memo(
  (props: {
    buttonProps?: ButtonProps;
    text?: string;
    isOpenNew?: boolean;
  }) => {
    const handleCreate = () => {
      if (props.isOpenNew) {
        window.open('/a2a/create');
      } else {
        history.push('/a2a/create');
      }
    };

    return (
      <Button
        onClick={handleCreate}
        type="primary"
        icon={<IconFont type="spark-plus-line" />}
        {...props.buttonProps}
      >
        {props.text ||
          $i18n.get({
            id: 'main.pages.A2A.Manage.createA2aAgent',
            dm: '创建A2A Agent',
          })}
      </Button>
    );
  },
);

function AgentsTab() {
  const { rightPortal } = useInnerLayout();
  const navigate = useNavigate();
  const [state, setState] = useSetState<{
    list: IA2aRemoteAgent[];
    pageNo: number;
    pageSize: number;
    total: number;
    loading: boolean;
  }>({
    list: [],
    pageNo: 1,
    pageSize: 50,
    total: 0,
    loading: false,
  });

  const fetchList = async (
    extraParams = {} as Partial<{ pageNo: number; pageSize: number }>,
  ) => {
    setState({ loading: true });
    try {
      const queryParams = {
        current: extraParams.pageNo ?? state.pageNo,
        size: extraParams.pageSize ?? state.pageSize,
      };
      const response = await listA2aAgents(queryParams);
      if (response?.data) {
        const pagingData = response.data as IPagingList<IA2aRemoteAgent>;
        setState({
          list: pagingData.records || [],
          total: pagingData.total || 0,
          pageNo: queryParams.current,
          pageSize: queryParams.size,
        });
      }
    } finally {
      setState({ loading: false });
    }
  };

  useMount(() => {
    fetchList();
  });

  const handleConfirmDelete = (item: IA2aRemoteAgent) => {
    AlertDialog.warning({
      title: $i18n.get({
        id: 'main.pages.A2A.Manage.confirmDelete',
        dm: '确认删除此A2A Agent吗',
      }),
      children: $i18n.get({
        id: 'main.pages.A2A.Manage.deleteWarning',
        dm: '删除后将不可恢复，已经添加该Agent的智能体可能会失效，请谨慎操作',
      }),
      danger: true,
      onOk: async () => {
        await deleteA2aAgent(item.agent_code);
        message.success(
          $i18n.get({
            id: 'main.pages.A2A.Manage.deletionSuccessful',
            dm: '删除成功',
          }),
        );
        fetchList();
      },
    });
  };

  const handleAction = (action?: string, item?: IA2aRemoteAgent) => {
    if (!action || !item) return;
    switch (action) {
      case 'delete':
        handleConfirmDelete(item);
        break;
      case 'edit':
        navigate(`/a2a/edit/${item.agent_code}`);
        break;
      case 'test':
      case 'detail':
        navigate(`/a2a/detail/${item.agent_code}`);
        break;
      default:
        navigate(`/a2a/detail/${item.agent_code}`);
    }
  };

  return (
    <div className={styles.container}>
      {state.list.length > 0 && rightPortal(<CreateA2aBtn />)}
      <CardList
        loading={state.loading}
        pagination={{
          current: state.pageNo,
          total: state.total,
          pageSize: state.pageSize,
          onChange: (page, pageSize) =>
            fetchList({ pageNo: page, pageSize }),
        }}
        emptyAction={<CreateA2aBtn />}
      >
        {state.list.map((item) => (
          <A2aCard
            key={item.agent_code}
            data={item}
            onClick={handleAction}
          />
        ))}
      </CardList>
    </div>
  );
}

function PublicationsTab() {
  const [state, setState] = useSetState<{
    list: IA2aPublication[];
    pageNo: number;
    pageSize: number;
    total: number;
    loading: boolean;
  }>({
    list: [],
    pageNo: 1,
    pageSize: 10,
    total: 0,
    loading: false,
  });

  const fetchList = async (
    extraParams = {} as Partial<{ pageNo: number; pageSize: number }>,
  ) => {
    setState({ loading: true });
    try {
      const current = extraParams.pageNo ?? state.pageNo;
      const size = extraParams.pageSize ?? state.pageSize;
      const response = await listA2aPublications({ current, size });
      if (response?.data) {
        setState({
          list: response.data.records || [],
          total: response.data.total || 0,
          pageNo: current,
          pageSize: size,
        });
      }
    } finally {
      setState({ loading: false });
    }
  };

  useMount(() => {
    fetchList();
  });

  const handleUnpublish = (item: IA2aPublication) => {
    AlertDialog.warning({
      title: $i18n.get({
        id: 'main.pages.A2A.Manage.confirmUnpublish',
        dm: '确认取消发布吗',
      }),
      danger: true,
      onOk: async () => {
        await unpublishA2a(item.publication_code);
        message.success(
          $i18n.get({
            id: 'main.pages.A2A.Manage.unpublishSuccessful',
            dm: '取消发布成功',
          }),
        );
        fetchList();
      },
    });
  };

  return (
    <Table
      loading={state.loading}
      rowKey="publication_code"
      dataSource={state.list}
      pagination={{
        current: state.pageNo,
        total: state.total,
        pageSize: state.pageSize,
        onChange: (page, pageSize) => fetchList({ pageNo: page, pageSize }),
      }}
      columns={[
        {
          title: $i18n.get({
            id: 'main.pages.A2A.Manage.agentName',
            dm: 'Agent名称',
          }),
          dataIndex: 'agent_name',
        },
        {
          title: 'App ID',
          dataIndex: 'app_id',
        },
        {
          title: $i18n.get({
            id: 'main.pages.A2A.Manage.appType',
            dm: '应用类型',
          }),
          dataIndex: 'app_type',
        },
        {
          title: $i18n.get({
            id: 'main.pages.A2A.Manage.description',
            dm: '描述',
          }),
          dataIndex: 'description',
          ellipsis: true,
        },
        {
          title: $i18n.get({
            id: 'main.pages.A2A.Manage.actions',
            dm: '操作',
          }),
          width: 120,
          render: (_: unknown, record: IA2aPublication) => (
            <Button
              type="link"
              danger
              onClick={() => handleUnpublish(record)}
            >
              {$i18n.get({
                id: 'main.pages.A2A.Manage.unpublish',
                dm: '取消发布',
              })}
            </Button>
          ),
        },
      ]}
    />
  );
}

export default function A2aManage() {
  return (
    <Flex vertical className="h-full">
      <Tabs
        destroyInactiveTabPane
        items={[
          {
            key: 'agents',
            label: $i18n.get({
              id: 'main.pages.A2A.Manage.remoteAgents',
              dm: '远程 Agents',
            }),
            children: <AgentsTab />,
          },
          {
            key: 'publications',
            label: $i18n.get({
              id: 'main.pages.A2A.Manage.myPublications',
              dm: '我的发布',
            }),
            children: <PublicationsTab />,
          },
        ]}
      />
    </Flex>
  );
}
