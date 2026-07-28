import defaultSettings from '@/defaultSettings';
import $i18n from '@/i18n';
import { A2aAgentSelectDrawer } from '@/pages/App/components/A2ASelector';
import { IA2aRemoteAgent } from '@/types/a2a';
import { Button, HelpIcon, IconFont } from '@spark-ai/design';
import { useSetState } from 'ahooks';
import { Divider, Flex } from 'antd';
import cls from 'classnames';
import { useContext, useEffect } from 'react';
import { AssistantAppContext } from '../../AssistantAppContext';
import SelectedConfigItem from '../SelectedConfigItem';
import styles from '../MCPSelectorComp/index.module.less';

export const A2A_MAX_LIMIT = defaultSettings.agentA2aMaxLimit;

export function SelectedA2aItem({
  item,
  handleRemove,
}: {
  item: IA2aRemoteAgent;
  handleRemove: (item: IA2aRemoteAgent) => void;
}) {
  return (
    <SelectedConfigItem
      iconType="spark-api-line"
      name={item.name}
      rightArea={
        <Flex gap={12}>
          <div style={{ color: 'var(--ag-ant-color-text-tertiary)' }}>
            {item.source_type}
          </div>
          <IconFont
            type="spark-delete-line"
            isCursorPointer
            onClick={() => handleRemove(item)}
          />
        </Flex>
      }
    />
  );
}

export default function A2ASelectorComp() {
  const { appState, onAppConfigChange } = useContext(AssistantAppContext);
  const { a2a_agents = [] as IA2aRemoteAgent[] } =
    appState.appBasicConfig?.config || {};
  const [state, setState] = useSetState({
    expand: false,
    selectVisible: false,
  });

  const onSelectAgents = (val: IA2aRemoteAgent[]) => {
    onAppConfigChange({ a2a_agents: val });
  };

  useEffect(() => {
    if (a2a_agents.length) {
      setState({ expand: true });
    }
  }, [a2a_agents]);

  const onRemove = (val: string) => {
    onSelectAgents(a2a_agents.filter((v) => v.agent_code !== val));
  };

  return (
    <Flex vertical gap={6} className="mb-[20px]">
      <Flex justify="space-between" align="center">
        <Flex
          gap={8}
          className="text-[13px] font-medium leading-[20px]"
          style={{ color: 'var(--ag-ant-color-text)' }}
          align="center"
        >
          <Flex align="center">
            <span>
              {$i18n.get({
                id: 'main.components.A2ASelectorComp.index.a2aAgent',
                dm: 'A2A Agent',
              })}
            </span>
            <HelpIcon
              content={$i18n.get({
                id: 'main.components.A2ASelectorComp.index.help',
                dm: '智能体可以通过A2A协议调用远程Agent。',
              })}
            />
          </Flex>
          <span
            className="text-[12px] leading-[20px]"
            style={{ color: 'var(--ag-ant-color-text-tertiary)' }}
          >
            {a2a_agents.length}/{A2A_MAX_LIMIT}
          </span>
        </Flex>
        <span>
          <Button
            style={{ padding: 0 }}
            onClick={() => setState({ selectVisible: true })}
            iconType="spark-plus-line"
            type="text"
            size="small"
          >
            A2A
          </Button>
          <Divider type="vertical" className="ml-[16px] mr-[16px]" />
          <IconFont
            onClick={() => setState({ expand: !state.expand })}
            className={cls(
              styles['expand-btn'],
              !state.expand && styles.hidden,
            )}
            type="spark-up-line"
            isCursorPointer
          />
        </span>
      </Flex>
      {state.expand && (
        <Flex vertical gap={8}>
          {a2a_agents.map(
            (item) =>
              item && (
                <SelectedA2aItem
                  handleRemove={() => onRemove(item.agent_code)}
                  item={item}
                  key={item.agent_code}
                />
              ),
          )}
        </Flex>
      )}
      {state.selectVisible && (
        <A2aAgentSelectDrawer
          selectedAgents={a2a_agents}
          onOk={onSelectAgents}
          onClose={() => setState({ selectVisible: false })}
        />
      )}
    </Flex>
  );
}
