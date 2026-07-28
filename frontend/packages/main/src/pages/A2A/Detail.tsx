import InnerLayout from '@/components/InnerLayout';
import $i18n from '@/i18n';
import {
  debugA2aInvoke,
  deleteA2aAgent,
  getA2aAgent,
  previewA2aCard,
} from '@/services/a2a';
import { IA2aRemoteAgent } from '@/types/a2a';
import {
  AlertDialog,
  Button,
  Dropdown,
  IconButton,
  Input,
  message,
} from '@spark-ai/design';
import { Flex, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './Detail.module.less';

const A2aDetail = () => {
  const navigate = useNavigate();
  const { agentCode } = useParams<{ agentCode: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const [detail, setDetail] = useState<IA2aRemoteAgent | null>(null);
  const [card, setCard] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugInput, setDebugInput] = useState('');
  const [debugOutput, setDebugOutput] = useState('');
  const [debugLoading, setDebugLoading] = useState(false);

  useEffect(() => {
    getDetail();
  }, [agentCode]);

  const getDetail = async () => {
    if (!agentCode) return;
    setLoading(true);
    try {
      const [detailRes, cardRes] = await Promise.all([
        getA2aAgent(agentCode),
        previewA2aCard(agentCode).catch(() => null),
      ]);
      setDetail(detailRes.data);
      setCard(cardRes?.data || null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!detail) return;
    AlertDialog.warning({
      title: $i18n.get({
        id: 'main.pages.A2A.Detail.confirmDelete',
        dm: '确认删除此A2A Agent吗',
      }),
      children: $i18n.get({
        id: 'main.pages.A2A.Detail.deleteWarning',
        dm: '删除后将不可恢复，已经添加该Agent的智能体可能会失效，请谨慎操作。',
      }),
      danger: true,
      onOk: () => {
        deleteA2aAgent(detail.agent_code).then(() => {
          message.success(
            $i18n.get({
              id: 'main.pages.A2A.Detail.deletionSuccessful',
              dm: '删除成功',
            }),
          );
          navigate('/a2a');
        });
      },
    });
  };

  const handleDebug = async () => {
    if (!agentCode || !debugInput.trim()) {
      message.warning(
        $i18n.get({
          id: 'main.pages.A2A.Detail.enterInput',
          dm: '请输入测试内容',
        }),
      );
      return;
    }
    setDebugLoading(true);
    try {
      const res = await debugA2aInvoke({
        agent_code: agentCode,
        input: debugInput,
      });
      setDebugOutput(res.data?.output || JSON.stringify(res.data, null, 2));
    } catch (e: any) {
      setDebugOutput(e?.message || 'Error');
    } finally {
      setDebugLoading(false);
    }
  };

  const operations = () => (
    <>
      <Dropdown
        getPopupContainer={(ele) => ele}
        menu={{
          items: [
            {
              onClick: () => handleDelete(),
              danger: true,
              label: $i18n.get({
                id: 'main.pages.A2A.Detail.delete',
                dm: '删除',
              }),
              key: 'delete',
            },
          ],
        }}
      >
        <IconButton icon="spark-more-line" bordered={false} />
      </Dropdown>
      <Button
        type="primary"
        onClick={() => navigate(`/a2a/edit/${agentCode}`)}
      >
        {$i18n.get({ id: 'main.pages.A2A.Detail.edit', dm: '编辑' })}
      </Button>
    </>
  );

  const renderOverview = () => {
    if (!detail) return null;
    return (
      <div className={styles['tools-content']}>
        <div className={styles['overview-item']}>
          <div className={styles.label}>
            {$i18n.get({ id: 'main.pages.A2A.Detail.name', dm: '名称' })}
          </div>
          <div className={styles.value}>{detail.name}</div>
        </div>
        <div className={styles['overview-item']}>
          <div className={styles.label}>
            {$i18n.get({
              id: 'main.pages.A2A.Detail.description',
              dm: '描述',
            })}
          </div>
          <div className={styles.value}>{detail.description || '-'}</div>
        </div>
        <div className={styles['overview-item']}>
          <div className={styles.label}>
            {$i18n.get({
              id: 'main.pages.A2A.Detail.sourceType',
              dm: '来源类型',
            })}
          </div>
          <div className={styles.value}>{detail.source_type}</div>
        </div>
        {detail.card_url && (
          <div className={styles['overview-item']}>
            <div className={styles.label}>Card URL</div>
            <div className={styles.value}>{detail.card_url}</div>
          </div>
        )}
        {detail.nacos_agent_name && (
          <div className={styles['overview-item']}>
            <div className={styles.label}>Nacos Agent</div>
            <div className={styles.value}>{detail.nacos_agent_name}</div>
          </div>
        )}
        <div className={styles['overview-item']}>
          <div className={styles.label}>Agent Code</div>
          <div className={styles.value}>{detail.agent_code}</div>
        </div>
      </div>
    );
  };

  const renderCard = () => (
    <div className={styles['tools-content']}>
      <div className={styles['card-json']}>
        {card
          ? JSON.stringify(card, null, 2)
          : detail?.card_json ||
            $i18n.get({
              id: 'main.pages.A2A.Detail.noCard',
              dm: '暂无 Agent Card',
            })}
      </div>
    </div>
  );

  const renderDebug = () => (
    <div className={styles['tools-content']}>
      <div className={styles['debug-section']}>
        <Flex vertical gap={8}>
          <div>
            {$i18n.get({
              id: 'main.pages.A2A.Detail.debugInput',
              dm: '输入',
            })}
          </div>
          <Input.TextArea
            value={debugInput}
            onChange={(e) => setDebugInput(e.target.value)}
            rows={4}
            placeholder={$i18n.get({
              id: 'main.pages.A2A.Detail.debugInputPlaceholder',
              dm: '输入要发送给远程Agent的消息',
            })}
          />
          <Button
            type="primary"
            loading={debugLoading}
            onClick={handleDebug}
            style={{ alignSelf: 'flex-start' }}
          >
            {$i18n.get({
              id: 'main.pages.A2A.Detail.invoke',
              dm: '调用',
            })}
          </Button>
        </Flex>
        <Flex vertical gap={8}>
          <div>
            {$i18n.get({
              id: 'main.pages.A2A.Detail.debugOutput',
              dm: '输出',
            })}
          </div>
          <Spin spinning={debugLoading}>
            <div className={styles['card-json']}>{debugOutput || '-'}</div>
          </Spin>
        </Flex>
      </div>
    </div>
  );

  return (
    <InnerLayout
      breadcrumbLinks={
        detail
          ? [
              {
                title: $i18n.get({
                  id: 'main.pages.A2A.index.a2aManagement',
                  dm: 'A2A管理',
                }),
                path: '/a2a',
              },
              {
                title:
                  detail.name ||
                  $i18n.get({
                    id: 'main.pages.A2A.Detail.a2aDetails',
                    dm: 'A2A详情',
                  }),
              },
            ]
          : []
      }
      loading={loading}
      tabs={[
        {
          label: $i18n.get({
            id: 'main.pages.A2A.Detail.overview',
            dm: '概览',
          }),
          key: 'overview',
          children: renderOverview(),
        },
        {
          label: $i18n.get({
            id: 'main.pages.A2A.Detail.agentCard',
            dm: 'Agent Card',
          }),
          key: 'card',
          children: renderCard(),
        },
        {
          label: $i18n.get({
            id: 'main.pages.A2A.Detail.debug',
            dm: '调试',
          }),
          key: 'debug',
          children: renderDebug(),
        },
      ]}
      right={operations()}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
};

export default A2aDetail;
