import $i18n from '@/i18n';
import PureLayout from '@/layouts/Pure';
import { CreateA2aBtn } from '@/pages/A2A/Manage';
import { listA2aAgents } from '@/services/a2a';
import {
  A2A_MAX_LIMIT,
  IA2aRemoteAgent,
  IListA2aAgentsParams,
} from '@/types/a2a';
import {
  Button,
  Drawer,
  Empty,
  IconFont,
  Input,
  message,
  Modal,
  Pagination,
} from '@spark-ai/design';
import { useSetState } from 'ahooks';
import { Flex, Spin } from 'antd';
import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import A2aAgentListItem from './A2aAgentListItem';

export interface IA2aAgentSelectorProps {
  onAgentsChange?: (val: IA2aRemoteAgent[]) => void;
  selectedAgents?: IA2aRemoteAgent[];
  onSelectAgent?: (item: IA2aRemoteAgent) => void;
  selectedAgent?: IA2aRemoteAgent;
  mode: 'multi' | 'single';
}

const A2aAgentSelector = (props: IA2aAgentSelectorProps) => {
  const [filterParams, setFilterParams] = useSetState<IListA2aAgentsParams>({
    current: 1,
    size: 10,
    name: '',
  });
  const [total, setTotal] = useState(0);
  const [list, setList] = useState<IA2aRemoteAgent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchList = () => {
    setLoading(true);
    listA2aAgents(filterParams)
      .then((res) => {
        setList(res.data.records);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, [filterParams]);

  const onInputChange = debounce((e) => {
    setFilterParams({ current: 1, name: e.target.value });
  }, 500);

  return (
    <>
      <Flex justify="space-between" className="mb-[24px]">
        <Input
          onChange={onInputChange}
          prefix={<IconFont type="spark-search-line" />}
          placeholder={$i18n.get({
            id: 'main.pages.App.components.A2ASelector.inputHere',
            dm: '在此输入',
          })}
          allowClear
          style={{ width: 220 }}
        />
        <CreateA2aBtn isOpenNew buttonProps={{ type: 'default' }} />
      </Flex>
      {loading ? (
        <Spin className="w-full h-full" />
      ) : (
        <Flex vertical gap={16}>
          {list.length ? (
            <>
              {list.map((item) => (
                <A2aAgentListItem
                  item={item}
                  key={item.agent_code}
                  selectMode={props.mode}
                  selectedAgents={props.selectedAgents}
                  selectedAgent={props.selectedAgent}
                  onSelectAgent={(agent) => {
                    if (props.mode === 'single') {
                      props.onSelectAgent?.(agent);
                      return;
                    }
                    if (
                      props.selectedAgents &&
                      props.selectedAgents.length >= A2A_MAX_LIMIT
                    ) {
                      message.warning(
                        $i18n.get({
                          id: 'main.pages.App.components.A2ASelector.reachedMaxLimit',
                          dm: '已达到最大数量限制',
                        }),
                      );
                      return;
                    }
                    props.onAgentsChange?.([
                      ...(props.selectedAgents || []),
                      agent,
                    ]);
                  }}
                  onRemoveAgent={(agentCode) => {
                    props.onAgentsChange?.(
                      (props.selectedAgents || []).filter(
                        (a) => a.agent_code !== agentCode,
                      ),
                    );
                  }}
                />
              ))}
              <Pagination
                pageSize={filterParams.size}
                current={filterParams.current}
                total={total}
                hideOnSinglePage
                hideTips
                onChange={(page, pageSize) => {
                  setFilterParams({ current: page, size: pageSize });
                }}
                pageSizeOptions={[10, 20]}
              />
            </>
          ) : (
            <Flex className="h-full" align="center" justify="center">
              <Empty
                title={
                  filterParams.name?.length
                    ? $i18n.get({
                        id: 'main.pages.App.components.A2ASelector.noSearchResult',
                        dm: '暂无搜索结果',
                      })
                    : $i18n.get({
                        id: 'main.pages.App.components.A2ASelector.noA2aAgent',
                        dm: '暂无A2A Agent',
                      })
                }
                description={
                  !filterParams.name?.length && (
                    <CreateA2aBtn
                      isOpenNew
                      text={$i18n.get({
                        id: 'main.pages.App.components.A2ASelector.goCreate',
                        dm: '去创建',
                      })}
                    />
                  )
                }
              />
            </Flex>
          )}
        </Flex>
      )}
    </>
  );
};

export interface IA2aSelectorDrawerProps {
  onOk: (val: IA2aRemoteAgent[]) => void;
  onClose: () => void;
  selectedAgents?: IA2aRemoteAgent[];
}

export const A2aAgentSelectDrawer = (props: IA2aSelectorDrawerProps) => {
  const [cacheSelected, setCacheSelected] = useState<IA2aRemoteAgent[]>([
    ...(props.selectedAgents || []),
  ]);
  return (
    <Drawer
      title={$i18n.get({
        id: 'main.pages.App.components.A2ASelector.selectA2aAgent',
        dm: '选择A2A Agent',
      })}
      open
      width={640}
      onClose={props.onClose}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          className="w-full"
        >
          <div
            style={{
              color: 'var(--ag-ant-color-text-tertiary)',
              fontSize: '14px',
              lineHeight: '24px',
            }}
          >
            {!!cacheSelected.length &&
              $i18n.get(
                {
                  id: 'main.pages.App.components.A2ASelector.addedA2a',
                  dm: '已添加A2A{var1}/{var2}',
                },
                { var1: cacheSelected.length, var2: A2A_MAX_LIMIT },
              )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button type="default" onClick={props.onClose}>
              {$i18n.get({
                id: 'main.pages.App.components.A2ASelector.cancel',
                dm: '取消',
              })}
            </Button>
            <Button
              type="primary"
              onClick={() => {
                props.onOk(cacheSelected);
                props.onClose();
                message.success(
                  $i18n.get({
                    id: 'main.pages.App.components.A2ASelector.addSuccess',
                    dm: '添加成功！',
                  }),
                );
              }}
            >
              {$i18n.get({
                id: 'main.pages.App.components.A2ASelector.confirm',
                dm: '确认',
              })}
            </Button>
          </div>
        </div>
      }
    >
      <A2aAgentSelector
        mode="multi"
        onAgentsChange={setCacheSelected}
        selectedAgents={cacheSelected}
      />
    </Drawer>
  );
};

export interface IA2aAgentSelectModalProps {
  onOk: (val: IA2aRemoteAgent) => void;
  onClose: () => void;
  selectedAgent?: IA2aRemoteAgent;
}

export const A2aAgentSelectModal = (props: IA2aAgentSelectModalProps) => {
  const [value, setValue] = useState<IA2aRemoteAgent | undefined>(
    props.selectedAgent,
  );
  return (
    <Modal
      width={740}
      title={$i18n.get({
        id: 'main.pages.App.components.A2ASelector.selectA2aAgent',
        dm: '选择A2A Agent',
      })}
      open
      onCancel={props.onClose}
      bodyProps={{ style: { padding: 0 } }}
      footer={
        <div className="justify-end flex gap-[8px]">
          <Button onClick={props.onClose}>
            {$i18n.get({
              id: 'main.pages.App.components.A2ASelector.cancel',
              dm: '取消',
            })}
          </Button>
          <Button
            type="primary"
            onClick={() => {
              if (!value) {
                message.warning(
                  $i18n.get({
                    id: 'main.pages.App.components.A2ASelector.selectPlease',
                    dm: '请选择A2A Agent',
                  }),
                );
                return;
              }
              props.onOk(value);
              props.onClose();
            }}
          >
            {$i18n.get({
              id: 'main.pages.App.components.A2ASelector.confirm',
              dm: '确定',
            })}
          </Button>
        </div>
      }
    >
      <div className="p-[16px_24px] max-h-[400px] overflow-y-auto">
        <A2aAgentSelector
          mode="single"
          onSelectAgent={setValue}
          selectedAgent={value}
        />
      </div>
    </Modal>
  );
};

export const A2aAgentSelectModalFuncs = {
  show: (options: {
    onOk?: (agent: IA2aRemoteAgent) => void;
    onCancel?: () => void;
    selectedAgent?: IA2aRemoteAgent;
  }) => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    const handleClose = () => {
      root.unmount();
      div.remove();
      options.onCancel?.();
    };

    const handleOk = (agent: IA2aRemoteAgent) => {
      options.onOk?.(agent);
      handleClose();
    };

    root.render(
      <PureLayout>
        <A2aAgentSelectModal
          selectedAgent={options.selectedAgent}
          onClose={handleClose}
          onOk={handleOk}
        />
      </PureLayout>,
    );
  },
};
