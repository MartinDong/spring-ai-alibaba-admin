import ProCard from '@/components/Card/ProCard';
import $i18n from '@/i18n';
import { A2aStatus, A2aStatusMap, IA2aRemoteAgent } from '@/types/a2a';
import { Button, Dropdown, IconFont } from '@spark-ai/design';
import type { MenuProps } from 'antd';
import classNames from 'classnames';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import styles from './index.module.less';

interface A2aCardProps {
  data: IA2aRemoteAgent;
  onClick?: (action?: string, data?: IA2aRemoteAgent) => void;
  className?: string;
}

const A2aCard: React.FC<A2aCardProps> = ({ data, onClick, className }) => {
  const {
    name,
    agent_code: agentCode,
    gmt_modified,
    description,
    source_type,
    status,
  } = data;
  const currentStatus = (status ?? A2aStatus.ENABLED) as A2aStatus;
  const { color, text } =
    A2aStatusMap[currentStatus] || A2aStatusMap[A2aStatus.ENABLED];

  const updateTime = useMemo(() => {
    return gmt_modified
      ? dayjs(gmt_modified).format('YYYY-MM-DD HH:mm:ss')
      : '-';
  }, [gmt_modified]);

  const handleDropdownClick: MenuProps['onClick'] = (info) => {
    info.domEvent.stopPropagation();
    onClick?.(info.key as string, data);
  };

  const handleButtonClick = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(action, data);
  };

  return (
    <ProCard
      title={name}
      logo="spark-api-line"
      statusNode={
        <div
          className={styles['status-tag']}
          style={{ color }}
          data-color={color}
        >
          <span className={styles.dot}></span>
          <span>{text}</span>
        </div>
      }
      info={[
        {
          label: $i18n.get({
            id: 'main.pages.A2A.components.A2aCard.description',
            dm: '描述',
          }),
          content: description || '-',
        },
        {
          label: $i18n.get({
            id: 'main.pages.A2A.components.A2aCard.sourceType',
            dm: '来源',
          }),
          content: source_type || '-',
        },
        {
          label: 'ID',
          content: agentCode,
        },
      ]}
      footerDescNode={
        <div className={styles['update-time']}>
          {$i18n.get({
            id: 'main.pages.A2A.components.A2aCard.updatedAt',
            dm: '更新于',
          })}
          {updateTime}
        </div>
      }
      footerOperateNode={
        <>
          <Button
            type="primary"
            className="flex-1"
            onClick={(e) => handleButtonClick('test', e)}
          >
            {$i18n.get({
              id: 'main.pages.A2A.components.A2aCard.test',
              dm: '测试',
            })}
          </Button>
          <Button
            type="default"
            className="flex-1"
            onClick={(e) => handleButtonClick('edit', e)}
          >
            {$i18n.get({
              id: 'main.pages.A2A.components.A2aCard.edit',
              dm: '编辑',
            })}
          </Button>
          <Dropdown
            getPopupContainer={(ele) => ele}
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'delete',
                  danger: true,
                  label: $i18n.get({
                    id: 'main.pages.A2A.components.A2aCard.delete',
                    dm: '删除',
                  }),
                },
              ],
              onClick: handleDropdownClick,
            }}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <Button icon={<IconFont type="spark-more-line" />} />
            </div>
          </Dropdown>
        </>
      }
      className={classNames(className)}
      onClick={() => onClick?.('detail', data)}
    />
  );
};

export default A2aCard;
