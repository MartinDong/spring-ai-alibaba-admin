import $i18n from '@/i18n';
import {
  getA2aPublicationByAppId,
  publishA2a,
  unpublishA2a,
} from '@/services/a2a';
import { IA2aPublication } from '@/types/a2a';
import { AlertDialog, Button, message } from '@spark-ai/design';
import { useMount, useSetState } from 'ahooks';
import { Modal, Form, Input } from 'antd';
import { useState } from 'react';

interface IProps {
  appId: string;
  appType?: string;
  defaultName?: string;
  defaultDescription?: string;
}

/**
 * Publish / Unpublish current Studio app as an A2A agent.
 */
export default function PublishA2AButton(props: IProps) {
  const { appId, appType, defaultName, defaultDescription } = props;
  const [publication, setPublication] = useState<IA2aPublication | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [state, setState] = useSetState({ fetching: true });

  const fetchPublication = async () => {
    if (!appId) return;
    setState({ fetching: true });
    try {
      const res = await getA2aPublicationByAppId(appId);
      setPublication(res?.data || null);
    } catch {
      setPublication(null);
    } finally {
      setState({ fetching: false });
    }
  };

  useMount(() => {
    fetchPublication();
  });

  const handlePublish = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const res = await publishA2a({
        app_id: appId,
        app_type: appType,
        agent_name: values.agent_name,
        description: values.description,
        register_nacos: true,
      });
      setPublication(res.data);
      setModalOpen(false);
      message.success(
        $i18n.get({
          id: 'main.components.PublishA2AButton.publishSuccess',
          dm: 'A2A发布成功',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublish = () => {
    if (!publication) return;
    AlertDialog.warning({
      title: $i18n.get({
        id: 'main.components.PublishA2AButton.confirmUnpublish',
        dm: '确认取消A2A发布吗',
      }),
      danger: true,
      onOk: async () => {
        await unpublishA2a(publication.publication_code);
        setPublication(null);
        message.success(
          $i18n.get({
            id: 'main.components.PublishA2AButton.unpublishSuccess',
            dm: '已取消A2A发布',
          }),
        );
      },
    });
  };

  if (state.fetching) {
    return null;
  }

  if (publication?.publication_code) {
    return (
      <Button onClick={handleUnpublish}>
        {$i18n.get({
          id: 'main.components.PublishA2AButton.unpublish',
          dm: '取消A2A发布',
        })}
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => {
          form.setFieldsValue({
            agent_name: defaultName || '',
            description: defaultDescription || '',
          });
          setModalOpen(true);
        }}
      >
        {$i18n.get({
          id: 'main.components.PublishA2AButton.publish',
          dm: '发布为A2A',
        })}
      </Button>
      <Modal
        title={$i18n.get({
          id: 'main.components.PublishA2AButton.publish',
          dm: '发布为A2A',
        })}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handlePublish}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="agent_name"
            label={$i18n.get({
              id: 'main.components.PublishA2AButton.agentName',
              dm: 'Agent名称',
            })}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label={$i18n.get({
              id: 'main.components.PublishA2AButton.description',
              dm: '描述',
            })}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
