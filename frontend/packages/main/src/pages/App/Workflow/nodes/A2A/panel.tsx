import $i18n from '@/i18n';
import {
  CustomInputsControl,
  OutputParamsTree,
  useNodeDataUpdate,
  useNodesOutputParams,
  useNodesReadOnly,
  useReactFlowStore,
} from '@spark-ai/flow';
import { Flex } from 'antd';
import { memo, useMemo } from 'react';
import InfoIcon from '../../components/InfoIcon';
import { useWorkflowAppStore } from '../../context/WorkflowAppProvider';
import { IA2ANodeData } from '../../types';

export default memo(function A2APanel(props: {
  id: string;
  data: IA2ANodeData;
}) {
  const { handleNodeDataUpdate } = useNodeDataUpdate();
  const { getVariableList } = useNodesOutputParams();
  const globalVariableList = useWorkflowAppStore(
    (state) => state.globalVariableList,
  );
  const nodes = useReactFlowStore((store) => store.nodes);
  const edges = useReactFlowStore((store) => store.edges);
  const { nodesReadOnly } = useNodesReadOnly();

  const flowVariableList = useMemo(() => {
    return getVariableList({
      nodeId: props.id,
    });
  }, [props.id, nodes, edges]);

  const variableList = useMemo(() => {
    return [...globalVariableList, ...flowVariableList];
  }, [globalVariableList, flowVariableList]);

  return (
    <>
      <div className="spark-flow-panel-form-section">
        <Flex vertical gap={12}>
          <div className="spark-flow-panel-form-title">
            {$i18n.get({
              id: 'main.pages.App.Workflow.nodes.A2A.panel.agent',
              dm: '远程 Agent',
            })}
          </div>
          <div>
            {props.data.node_param.agent_name ||
              props.data.node_param.agent_code ||
              $i18n.get({
                id: 'main.pages.App.Workflow.nodes.A2A.panel.notSelected',
                dm: '未选择',
              })}
          </div>
        </Flex>
      </div>
      <div className="spark-flow-panel-form-section">
        <Flex vertical gap={12}>
          <div className="spark-flow-panel-form-title">
            {$i18n.get({
              id: 'main.pages.App.Workflow.nodes.A2A.panel.input',
              dm: '输入',
            })}
            <InfoIcon
              tip={$i18n.get({
                id: 'main.pages.App.Workflow.nodes.A2A.panel.inputTip',
                dm: '发送给远程A2A Agent的输入消息。',
              })}
            />
          </div>
          <CustomInputsControl
            disabledKey
            onChange={(payload) => {
              handleNodeDataUpdate({
                id: props.id,
                data: {
                  input_params: payload,
                },
              });
            }}
            value={props.data.input_params}
            variableList={variableList}
            disabled={nodesReadOnly}
          />
        </Flex>
      </div>
      <div className="spark-flow-panel-form-section">
        <Flex vertical gap={12}>
          <div className="spark-flow-panel-form-title">
            {$i18n.get({
              id: 'main.pages.App.Workflow.nodes.A2A.panel.output',
              dm: '输出',
            })}
            <InfoIcon
              tip={$i18n.get({
                id: 'main.pages.App.Workflow.nodes.A2A.panel.outputTip',
                dm: '输出本节点处理结果的变量，用于后续节点识别和处理本节点的处理结果。',
              })}
            />
          </div>
          <OutputParamsTree data={props.data.output_params} />
        </Flex>
      </div>
    </>
  );
});
