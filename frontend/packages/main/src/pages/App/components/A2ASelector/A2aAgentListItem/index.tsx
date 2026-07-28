import $i18n from '@/i18n';
import { IA2aRemoteAgent } from '@/types/a2a';
import { IconFont, renderTooltip } from '@spark-ai/design';
import { Checkbox, Flex, Radio, Typography } from 'antd';
import classNames from 'classnames';
import { useEffect, useState } from 'react';
import styles from './index.module.less';

interface IProps {
  item: IA2aRemoteAgent;
  selectMode: 'multi' | 'single';
  selectedAgents?: IA2aRemoteAgent[];
  selectedAgent?: IA2aRemoteAgent;
  onSelectAgent?: (val: IA2aRemoteAgent) => void;
  onRemoveAgent?: (val: string) => void;
}

export default (props: IProps) => {
  const {
    item,
    selectMode,
    selectedAgents = [],
    selectedAgent,
  } = props;
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    if (selectMode === 'multi') {
      setSelected(
        !!selectedAgents.find((a) => a.agent_code === item.agent_code),
      );
    } else {
      setSelected(selectedAgent?.agent_code === item.agent_code);
    }
  }, [item, selectMode, selectedAgent, selectedAgents]);

  return (
    <div
      className={classNames(styles['a2a-agent-wrapper'], {
        [styles.active]: selected,
      })}
      style={{ padding: '12px 16px' }}
    >
      <Flex gap={8} align="center">
        {selectMode === 'multi' ? (
          <Checkbox
            checked={selected}
            onChange={(e) => {
              if (e.target.checked) {
                props.onSelectAgent?.(item);
              } else {
                props.onRemoveAgent?.(item.agent_code);
              }
            }}
          />
        ) : (
          <Radio
            checked={selected}
            onChange={() => props.onSelectAgent?.(item)}
          />
        )}
        <Flex gap={8} className="w-full h-[52px] flex-1" align="center">
          <Flex
            align="center"
            justify="center"
            className="h-[40px] w-[40px] rounded-[6px]"
            style={{
              border: '1px solid var(--ag-ant-color-border-secondary)',
            }}
          >
            <IconFont type="spark-api-line" />
          </Flex>
          <div style={{ width: 'calc(100% - 48px)' }}>
            <Flex justify="space-between" className="leading-[22px] h-[22px]">
              <Typography.Text
                className="text-[16px] font-semibold mr-[4px]"
                ellipsis={{ tooltip: renderTooltip(item.name) }}
              >
                {item.name}
              </Typography.Text>
              <span
                style={{
                  color: 'var(--ag-ant-color-text-tertiary)',
                  fontSize: 12,
                }}
              >
                {item.source_type}
              </span>
            </Flex>
            <div className={styles.desc}>
              {item.description ||
                $i18n.get({
                  id: 'main.pages.App.components.A2ASelector.noDescription',
                  dm: '暂无描述',
                })}
            </div>
          </div>
        </Flex>
      </Flex>
    </div>
  );
};
