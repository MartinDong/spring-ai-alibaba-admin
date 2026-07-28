import InnerLayout from '@/components/InnerLayout';
import $i18n from '@/i18n';
import {
  createA2aAgent,
  getA2aAgent,
  updateA2aAgent,
} from '@/services/a2a';
import {
  A2aSourceType,
  ICreateA2aAgentParams,
  IUpdateA2aAgentParams,
} from '@/types/a2a';
import { AlertDialog, Button, Form, Input, message } from '@spark-ai/design';
import { useMount } from 'ahooks';
import { Flex, Radio } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './Create.module.less';

export default function A2aCreate() {
  const navigate = useNavigate();
  const { agentCode } = useParams<{ agentCode: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(!!agentCode);
  const [saveLoading, setSaveLoading] = useState(false);
  const [sourceType, setSourceType] = useState<A2aSourceType>(A2aSourceType.URL);
  const [initialData, setInitialData] = useState<any>(null);

  useMount(() => {
    if (agentCode) {
      getA2aAgent(agentCode)
        .then((res) => {
          if (res?.data) {
            const data = res.data;
            setInitialData(data);
            setSourceType(
              (data.source_type as A2aSourceType) || A2aSourceType.URL,
            );
            form.setFieldsValue({
              name: data.name,
              description: data.description,
              card_url: data.card_url,
              nacos_agent_name: data.nacos_agent_name,
            });
          }
        })
        .finally(() => setLoading(false));
    }
  });

  const handleOk = async () => {
    if (saveLoading) return;
    try {
      const formValues = await form.validateFields();
      setSaveLoading(true);
      const apiParams: ICreateA2aAgentParams = {
        name: formValues.name,
        description: formValues.description || '',
        source_type: sourceType,
        card_url:
          sourceType === A2aSourceType.URL ? formValues.card_url : undefined,
        nacos_agent_name:
          sourceType === A2aSourceType.NACOS
            ? formValues.nacos_agent_name
            : undefined,
      };

      if (agentCode) {
        const updateParams: IUpdateA2aAgentParams = {
          ...apiParams,
          agent_code: agentCode,
        };
        await updateA2aAgent(updateParams);
        message.success(
          $i18n.get({
            id: 'main.pages.A2A.Create.updateSuccess',
            dm: 'A2A Agent更新成功',
          }),
        );
      } else {
        await createA2aAgent(apiParams);
        message.success(
          $i18n.get({
            id: 'main.pages.A2A.Create.createSuccess',
            dm: 'A2A Agent创建成功',
          }),
        );
      }
      navigate('/a2a');
    } finally {
      setSaveLoading(false);
    }
  };

  const isFormChanged = () => {
    const currentValues = form.getFieldsValue();
    if (!agentCode) {
      return !!(
        currentValues.name ||
        currentValues.description ||
        currentValues.card_url ||
        currentValues.nacos_agent_name
      );
    }
    if (initialData) {
      return (
        currentValues.name !== initialData.name ||
        currentValues.description !== initialData.description ||
        currentValues.card_url !== initialData.card_url ||
        currentValues.nacos_agent_name !== initialData.nacos_agent_name ||
        sourceType !== initialData.source_type
      );
    }
    return false;
  };

  const onBack = () => {
    if (isFormChanged()) {
      AlertDialog.warning({
        title: $i18n.get({
          id: 'main.pages.A2A.Create.confirmReturn',
          dm: '确认返回吗',
        }),
        children: $i18n.get({
          id: 'main.pages.A2A.Create.returnWarning',
          dm: '返回将不会保存当前编辑的内容，确认返回吗？',
        }),
        onOk: () => navigate('/a2a'),
      });
    } else {
      navigate('/a2a');
    }
  };

  const renderOkText = useMemo(() => {
    if (saveLoading) {
      return agentCode
        ? $i18n.get({ id: 'main.pages.A2A.Create.saving', dm: '保存中...' })
        : $i18n.get({ id: 'main.pages.A2A.Create.creating', dm: '创建中...' });
    }
    return agentCode
      ? $i18n.get({ id: 'main.pages.A2A.Create.save', dm: '保存' })
      : $i18n.get({ id: 'main.pages.A2A.Create.create', dm: '创建' });
  }, [saveLoading, agentCode]);

  return (
    <InnerLayout
      loading={loading}
      breadcrumbLinks={[
        {
          title: $i18n.get({
            id: 'main.pages.A2A.index.a2aManagement',
            dm: 'A2A管理',
          }),
          onClick: onBack,
        },
        {
          title: agentCode
            ? $i18n.get({
                id: 'main.pages.A2A.Create.editA2aAgent',
                dm: '编辑A2A Agent',
              })
            : $i18n.get({
                id: 'main.pages.A2A.Create.createA2aAgent',
                dm: '创建A2A Agent',
              }),
        },
      ]}
      bottom={
        <div className={styles['bottom-container']}>
          <Button loading={saveLoading} onClick={handleOk} type="primary">
            {renderOkText}
          </Button>
          <Button onClick={onBack}>
            {$i18n.get({ id: 'main.pages.A2A.Create.cancel', dm: '取消' })}
          </Button>
        </div>
      }
    >
      <div className={styles.page}>
        <Flex className={styles.container} vertical>
          <div className={styles['content-wrap']}>
            <Form className={styles.content} form={form} layout="vertical">
              <Form.Item
                required
                label={$i18n.get({
                  id: 'main.pages.A2A.Create.name',
                  dm: '名称',
                })}
                name="name"
                rules={[
                  {
                    required: true,
                    message: $i18n.get({
                      id: 'main.pages.A2A.Create.enterName',
                      dm: '请输入名称',
                    }),
                  },
                ]}
              >
                <Input
                  className={styles['fixed-width']}
                  showCount
                  maxLength={30}
                  placeholder={$i18n.get({
                    id: 'main.pages.A2A.Create.namePlaceholder',
                    dm: 'A2A Agent名称',
                  })}
                />
              </Form.Item>
              <Form.Item
                name="description"
                label={$i18n.get({
                  id: 'main.pages.A2A.Create.description',
                  dm: '描述',
                })}
              >
                <Input.TextArea
                  className={styles['fixed-width']}
                  showCount
                  maxLength={200}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  placeholder={$i18n.get({
                    id: 'main.pages.A2A.Create.descriptionPlaceholder',
                    dm: '描述你的A2A Agent',
                  })}
                />
              </Form.Item>
              <Form.Item
                label={$i18n.get({
                  id: 'main.pages.A2A.Create.sourceType',
                  dm: '来源类型',
                })}
                required
              >
                <Radio.Group
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  disabled={!!agentCode}
                >
                  <Radio value={A2aSourceType.URL}>URL</Radio>
                  <Radio value={A2aSourceType.NACOS}>Nacos</Radio>
                </Radio.Group>
              </Form.Item>
              {sourceType === A2aSourceType.URL && (
                <Form.Item
                  name="card_url"
                  label={$i18n.get({
                    id: 'main.pages.A2A.Create.cardUrl',
                    dm: 'Agent Card URL',
                  })}
                  rules={[
                    {
                      required: true,
                      message: $i18n.get({
                        id: 'main.pages.A2A.Create.enterCardUrl',
                        dm: '请输入Agent Card URL',
                      }),
                    },
                  ]}
                >
                  <Input
                    className={styles['fixed-width']}
                    placeholder="https://example.com/.well-known/agent.json"
                  />
                </Form.Item>
              )}
              {sourceType === A2aSourceType.NACOS && (
                <Form.Item
                  name="nacos_agent_name"
                  label={$i18n.get({
                    id: 'main.pages.A2A.Create.nacosAgentName',
                    dm: 'Nacos Agent名称',
                  })}
                  rules={[
                    {
                      required: true,
                      message: $i18n.get({
                        id: 'main.pages.A2A.Create.enterNacosAgentName',
                        dm: '请输入Nacos Agent名称',
                      }),
                    },
                  ]}
                >
                  <Input
                    className={styles['fixed-width']}
                    placeholder={$i18n.get({
                      id: 'main.pages.A2A.Create.nacosAgentNamePlaceholder',
                      dm: 'Nacos中注册的Agent名称',
                    })}
                  />
                </Form.Item>
              )}
            </Form>
          </div>
        </Flex>
      </div>
    </InnerLayout>
  );
}
