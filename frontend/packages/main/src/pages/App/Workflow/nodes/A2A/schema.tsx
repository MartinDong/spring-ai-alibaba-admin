import $i18n from '@/i18n';
import { INodeSchema } from '@spark-ai/flow';
import { IA2ANodeData, IA2ANodeParam } from '../../types';
import { transformInputParams } from '../../utils';

const getA2ANodeVariables = (data: IA2ANodeData) => {
  const variableKeyMap: Record<string, boolean> = {};
  const { input_params } = data;
  transformInputParams(input_params, variableKeyMap);
  return Object.keys(variableKeyMap);
};

export const A2ASchema: INodeSchema = {
  type: 'A2A',
  title: 'A2A',
  desc: $i18n.get({
    id: 'main.pages.App.Workflow.nodes.A2A.schema.desc',
    dm: '调用远程A2A Agent。',
  }),
  iconType: 'spark-api-line',
  groupLabel: $i18n.get({
    id: 'main.pages.App.Workflow.nodes.A2A.schema.tool',
    dm: '工具',
  }),
  defaultParams: {
    input_params: [
      {
        key: 'input',
        type: 'String',
        value_from: 'refer',
        value: undefined,
      },
    ],
    output_params: [
      {
        key: 'output',
        type: 'String',
        desc: $i18n.get({
          id: 'main.pages.App.Workflow.nodes.A2A.schema.result',
          dm: '结果',
        }),
      },
    ],
    node_param: {
      agent_code: '',
      agent_name: '',
      input: '',
    } as IA2ANodeParam,
  },
  isSystem: false,
  allowSingleTest: true,
  disableConnectSource: true,
  disableConnectTarget: true,
  bgColor: 'var(--ag-ant-color-blue-hover)',
  customAdd: true,
  getRefVariables: (data) => getA2ANodeVariables(data as IA2ANodeData),
};
