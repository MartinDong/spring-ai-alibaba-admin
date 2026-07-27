import React, { useState, useEffect, useCallback } from 'react';
import {
  DatePicker,
  Form,
  Input,
  Select,
  Button,
  Table,
  Drawer,
  Row,
  Col,
  Card,
  Typography,
  Space,
  Tag,
  Timeline,
  Empty,
  Spin,
  Tooltip,
  Statistic,
  Tabs,
  Popover,
  Modal,
  message
} from 'antd';
import { SearchOutlined, PlusOutlined, MinusCircleOutlined, DownOutlined, DatabaseOutlined, CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactJsonView from "react-json-view";
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import API from '../../services';
import { handleApiError, notifyError } from '../../utils/notification';
import './tracing.css';
import usePagination from '../../hooks/usePagination';
import type { ColumnType } from 'antd/lib/table';
import { copyToClipboard, safeJSONParse } from '../../utils/util';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

// --- Helper Functions ---

const formatDuration = (ms: number) => {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return '-';
  return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss');
};

const SOURCE_TYPE_MAP: Record<string, string> = {
  prompt: 'Prompt',
  playground: 'Playground',
  experiment: '实验',
  evaluator: '评估器',
};

const STATUS_COLOR_MAP: Record<string, string> = {
  Ok: 'green',
  Error: 'red',
  default: 'default',
};

/** Extract readable text preview from gen_ai.*.messages JSON (Langfuse-style truncated cell). */
const extractMessagePreview = (raw: unknown, roleFilter?: string, maxLen = 140): string => {
  if (raw == null || raw === '') return '';
  try {
    const msgs = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(msgs)) {
      const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
      return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
    }
    const filtered = roleFilter ? msgs.filter((m: any) => m?.role === roleFilter) : msgs;
    const texts = filtered.flatMap((m: any) => {
      if (typeof m?.content === 'string') return [m.content];
      if (Array.isArray(m?.parts)) {
        return m.parts.map((p: any) => p?.text ?? p?.content ?? (typeof p === 'string' ? p : JSON.stringify(p)));
      }
      return [JSON.stringify(m)];
    });
    const joined = texts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (!joined) return '';
    return joined.length > maxLen ? `${joined.slice(0, maxLen)}…` : joined;
  } catch {
    const s = String(raw);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  }
};

const PrettyJsonBlock: React.FC<{ title: string; data: any; maxHeight?: number }> = ({
  title,
  data,
  maxHeight = 480,
}) => {
  const src = typeof data === 'string' ? safeJSONParse(data, () => data) : data;
  // false = fully expanded (default); true = fully collapsed
  const [collapsed, setCollapsed] = useState(false);
  const viewKey = `${title}-${collapsed ? 'c' : 'e'}`;

  return (
    <div className="trace-io-block">
      <div className="trace-io-block-title">
        <span>{title}</span>
        <Space size={4} className="trace-io-block-actions">
          <Button
            type="link"
            size="small"
            disabled={!collapsed}
            onClick={() => setCollapsed(false)}
          >
            展开
          </Button>
          <Button
            type="link"
            size="small"
            disabled={collapsed}
            onClick={() => setCollapsed(true)}
          >
            折叠
          </Button>
        </Space>
      </div>
      <div className="trace-io-block-body" style={{ maxHeight }}>
        {src == null || src === '' ? (
          <span className="trace-muted">—</span>
        ) : (
          <ReactJsonView
            key={viewKey}
            src={typeof src === 'object' ? src : { value: src }}
            name={false}
            collapsed={collapsed}
            displayDataTypes={false}
            enableClipboard
            style={{ background: 'transparent', fontSize: 12, width: '100%' }}
          />
        )}
      </div>
    </div>
  );
};

const AttrRow: React.FC<{ name: string; value: unknown }> = ({ name, value }) => {
  const text = value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  return (
    <div className="trace-attr-row">
      <div className="trace-attr-key" title={name}>{name}</div>
      <div className="trace-attr-value">
        <span className="trace-attr-text" title={text}>{text || '—'}</span>
        {text ? (
          <CopyOutlined
            className="trace-attr-copy"
            onClick={() => {
              copyToClipboard(text).then(() => message.success('复制成功')).catch(() => message.error('复制失败'));
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

// --- Span Waterfall Components ---

interface Span {
  spanID: string;
  parentSpanID?: string;
  operationName: string;
  startTime: string;
  finishTime: string;
  duration: number;
  attributes: Record<string, any>;
  events: any[];
  kind: string;
  status: { code: string; message?: string };
  children?: Span[];
  _original?: any; // To hold original API span data
}

const flattenTreeForWaterfall = (
  spans: Span[],
  collapsedSpanIDs: Set<string>,
  depth = 0
): { span: Span, depth: number }[] => {
  let list: { span: Span, depth: number }[] = [];
  for (const span of spans) {
    list.push({ span, depth });
    if (span.children && span.children.length > 0 && !collapsedSpanIDs.has(span.spanID)) {
      list = list.concat(flattenTreeForWaterfall(span.children, collapsedSpanIDs, depth + 1));
    }
  }
  return list;
};

interface SpanWaterfallRowProps {
  span: Span;
  depth: number;
  traceStartTime: number;
  traceTotalDuration: number;
  onSpanSelect: (span: Span) => void;
  isSelected: boolean;
  onToggleCollapse: (spanID: string) => void;
  isCollapsed: boolean;
}

const SpanWaterfallRow: React.FC<SpanWaterfallRowProps> = ({ span, depth, traceStartTime, traceTotalDuration, onSpanSelect, isSelected, onToggleCollapse, isCollapsed }) => {
  const offsetMs = new Date(span.startTime).getTime() - traceStartTime;
  const offsetPercent = Math.max(0, Math.min(100, (offsetMs / traceTotalDuration) * 100));
  const widthPercent = Math.max(1.5, Math.min(100 - offsetPercent, (span.duration / traceTotalDuration) * 100));

  const hoverContent = (
    <div>
      <p><strong>Operation:</strong> {span.operationName}</p>
      <p><strong>Start Time:</strong> {formatDateTime(span.startTime)}</p>
      <p><strong>Finish Time:</strong> {formatDateTime(span.finishTime)}</p>
      <p><strong>Duration:</strong> {formatDuration(span.duration)}</p>
    </div>
  );

  const attr = span.attributes || {};
  const types: Record<string, string> = {
    "framework": "geekblue",
    "chat": "green",
    "execute_tool": "gold",
  };

  const bgColors: Record<string, string> = {
    "framework": "#adc6ff",
    "chat": "#b7eb8f",
    "execute_tool": "#ffe58f",
  };
  const operationName = attr["gen_ai.operation.name"];
  const hasChildren = span.children && span.children.length > 0;

  const handleAddToDataset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof (window as any).handleAddToDataset === 'function') {
      (window as any).handleAddToDataset(span);
    }
  };

  const indent = depth * 14 + 8;

  return (
    <div
      className={`span-waterfall-row ${isSelected ? 'is-selected' : ''}`}
      onClick={() => onSpanSelect(span)}
    >
      <div className="span-waterfall-row-main" style={{ paddingLeft: indent }}>
        {hasChildren ? (
          <button
            type="button"
            className={`span-waterfall-toggle ${isCollapsed ? 'is-collapsed' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(span.spanID); }}
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <DownOutlined style={{ fontSize: 10 }} />
          </button>
        ) : (
          <span className="span-waterfall-toggle-spacer" />
        )}
        <Tooltip title={span.operationName}>
          <div className="span-waterfall-name">{span.operationName}</div>
        </Tooltip>
        {operationName ? (
          <Tag className="span-waterfall-tag" color={types[operationName]}>{operationName}</Tag>
        ) : null}
        {operationName === 'chat' ? (
          <Tooltip title="添加到评测集">
            <Button
              size="small"
              type="text"
              className="span-waterfall-action"
              icon={<DatabaseOutlined />}
              onClick={handleAddToDataset}
            />
          </Tooltip>
        ) : null}
        <span className="span-waterfall-duration">{formatDuration(span.duration)}</span>
      </div>
      <div className="span-waterfall-row-bar" style={{ paddingLeft: indent + 22 }}>
        <Tooltip title={hoverContent}>
          <div className="span-timeline-track">
            <div
              className="span-timeline-bar"
              style={{
                left: `${offsetPercent}%`,
                width: `${widthPercent}%`,
                backgroundColor: bgColors[operationName] || '#91caff',
              }}
            />
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

// --- Main Tracing Page Component ---

function TracingPage() {
  const [timeRange, setTimeRange] = useState([dayjs().subtract(3, 'hour'), dayjs()]);
  const [form] = Form.useForm();
  const serviceName = Form.useWatch('serviceName', form);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [traces, setTraces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { pagination, setPagination, onShowSizeChange, onPaginationChange } = usePagination();

  const [overviewData, setOverviewData] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [services, setServices] = useState<string[]>([]);
  const [operations, setOperations] = useState<string[]>([]);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<TracingAPI.GetTracesResult["pageItems"][0] | null>(null);
  const [traceDetail, setTraceDetail] = useState<any>(null);
  const [traceDetailLoading, setTraceDetailLoading] = useState(false);
  const [spanTree, setSpanTree] = useState<Span[]>([]);
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [filteredPromptName, setFilteredPromptName] = useState<string | null>(null);
  const [collapsedSpans, setCollapsedSpans] = useState<Set<string>>(new Set());

  // 添加到评测集弹出框相关状态
  const [addToDatasetModalVisible, setAddToDatasetModalVisible] = useState(false);
  const [selectedSpanForDataset, setSelectedSpanForDataset] = useState<Span | null>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [datasetVersions, setDatasetVersions] = useState<any[]>([]);
  const [datasetVersionsLoading, setDatasetVersionsLoading] = useState(false);
  const [datasetColumns, setDatasetColumns] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [selectedDatasetVersionId, setSelectedDatasetVersionId] = useState<string>('');
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  // 新增状态用于存储提取的数据
  const [inputContentValues, setInputContentValues] = useState<string[]>([]);
  const [outputContentValues, setOutputContentValues] = useState<string[]>([]);
  const [otherAttrValues, setOtherAttrValues] = useState<Record<string, any>>({});

  // 添加处理函数
  const handleDatasetChange = (value: string) => {
    setSelectedDatasetId(value);
    setDatasetVersions([]);
    setDatasetColumns([]);
    setSelectedDatasetVersionId('');
    setFieldMappings({});
    if (value) {
      // 并行调用两个接口：获取版本列表和评测集详情
      Promise.all([
        fetchDatasetVersions(value),
        fetchDatasetDetail(value)
      ]).catch(error => {
        console.error('获取评测集信息失败:', error);
        message.error('获取评测集信息失败');
      });
    }
  };

  const handleDatasetVersionChange = (value: string) => {
    setSelectedDatasetVersionId(value);
    // 不再更新datasetColumns，保持从评测集详情接口获取的columnsConfig
    // 只做版本选择的处理
  };

  const handleFieldMappingChange = (spanField: string, datasetField: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [spanField]: datasetField
    }));
  };

  // --- API Calls ---

  const fetchServices = useCallback(async () => {
    try {
      const formValues = form.getFieldsValue();
      const [startTime, endTime] = formValues.timeRange || [dayjs().subtract(3, 'hour'), dayjs()];
      const res = await API.observability.getServices({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      if (res.code === 200) {
        setServices(res.data.services?.map((s: any) => s.name) || []);
        setOperations([...new Set(res.data.services?.flatMap((s: any) => s.operations) || [])]);
      }
    } catch (error) {
      handleApiError(error, '获取服务列表失败');
    }
  }, []);

  const getFilterParams = useCallback(() => {
    const formValues = form.getFieldsValue();
    const [startTime, endTime] = timeRange || [dayjs().subtract(3, 'hour'), dayjs()];
    const advancedFilters = formValues.advancedFilters?.filter((f: any) => f && f.key && f.value) || [];

    if (formValues.sourceType) {
      advancedFilters.push({ key: "spring.ai.alibaba.studio.source", value: formValues.sourceType });
    }

    return {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      serviceName: formValues.serviceName,
      traceId: formValues.traceId,
      spanName: formValues.spanName,
      attributes: advancedFilters?.length ? JSON.stringify(
        advancedFilters.reduce((acc: any, cur: any) => {
          acc[cur.key] = cur.value;
          return acc;
        }, {})
      ) : undefined,
      pageNumber: pagination.current,
      pageSize: pagination.pageSize,
    };
  }, [form, pagination, timeRange]);

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await API.observability.getOverview({
        startTime: timeRange[0].toISOString(),
        endTime: timeRange[1].toISOString(),
        detail: true
      });
      if (res.code === 200) {
        setOverviewData(res.data);
      }
    } catch (error) {
      handleApiError(error, '获取概览数据失败');
    } finally {
      setOverviewLoading(false);
    }
  }, [timeRange]);

  const fetchTraces = useCallback(async (pageParams = {}) => {
    setLoading(true);
    const query = {
      ...getFilterParams(),
      ...pageParams,
    };

    try {
      const res = await API.observability.getTraces(query);
      if (res.code === 200) {
        setTraces(res.data.pageItems || []);
        setPagination(prev => ({ ...prev, total: res.data.totalCount || 0 }));
      }
    } catch (error) {
      handleApiError(error, '获取Trace列表失败');
    } finally {
      setLoading(false);
    }
  }, [getFilterParams, timeRange]);

  const onSearch = useCallback(() => {
    fetchTraces();
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  useEffect(() => {
    const locationState = location.state || {}
    const promptKey = locationState.adv?.["spring.ai.alibaba.prompt.key"];
    const traceId = locationState.traceId || searchParams.get('traceId');

    if (traceId) {
      form.setFieldValue("traceId", traceId);
    }

    if (promptKey) {
      setFilteredPromptName(promptKey);
      const advancedFilters = [];
      advancedFilters.push({ key: 'spring.ai.alibaba.prompt.key', value: promptKey });

      form.setFieldsValue({
        advancedFilters: advancedFilters
      });
    }

    fetchServices();
  }, []); // Intentionally run only on mount

  useEffect(() => {
    fetchOverview();
    fetchTraces();
  }, [timeRange])

  const handleClearPromptFilter = () => {
    setFilteredPromptName(null);
    navigate('/tracing', { replace: true });
    const currentFilters = form.getFieldValue('advancedFilters') || [];
    const newFilters = currentFilters.filter((f: any) => f.key !== 'promptKey' && f.key !== 'promptVersion');
    form.setFieldsValue({
      sourceType: undefined,
      advancedFilters: newFilters.length > 0 ? newFilters : undefined
    });
    onSearch();
  };

  const toggleSpanCollapse = (spanID: string) => {
    setCollapsedSpans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spanID)) {
        newSet.delete(spanID);
      } else {
        newSet.add(spanID);
      }
      return newSet;
    });
  };

  // 获取评测集列表
  const fetchDatasets = useCallback(async () => {
    try {
      setDatasetsLoading(true);
      const response = await API.getDatasets({
        pageNumber: 1,
        pageSize: 100
      });

      if (response.code === 200 && response.data) {
        // 根据API定义，使用pageItems而不是records
        const dataItems = response.data.pageItems || [];
        const transformedDatasets = dataItems.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description || ''
        }));
        setDatasets(transformedDatasets);
      } else {
        setDatasets([]);
        message.error('获取评测集列表失败');
      }
    } catch (error) {
      setDatasets([]);
      message.error('获取评测集列表失败');
    } finally {
      setDatasetsLoading(false);
    }
  }, []);

  // 获取评测集版本列表
  const fetchDatasetVersions = useCallback(async (datasetId: string) => {
    try {
      setDatasetVersionsLoading(true);
      const response = await API.getDatasetVersions({
        datasetId: Number(datasetId),
        pageNumber: 1,
        pageSize: 50
      });

      if (response.code === 200 && response.data) {
        const versionsData = response.data.pageItems || [];
        setDatasetVersions(versionsData);

        // 自动选择第一个版本
        if (versionsData.length > 0) {
          const firstVersion = versionsData[0];
          setSelectedDatasetVersionId(firstVersion.id.toString());
        }
      } else {
        setDatasetVersions([]);
        message.error('获取评测集版本列表失败');
      }
    } catch (error) {
      setDatasetVersions([]);
      message.error('获取评测集版本列表失败');
    } finally {
      setDatasetVersionsLoading(false);
    }
  }, []);

  // 获取评测集详情
  const fetchDatasetDetail = useCallback(async (datasetId: string) => {
    try {
      const response = await API.getDataset({
        datasetId: Number(datasetId)
      });

      if (response.code === 200 && response.data) {
        // 解析columnsConfig字段获取列结构信息
        try {
          const columnsConfig = JSON.parse(response.data.columnsConfig || '[]');
          if (Array.isArray(columnsConfig)) {
            setDatasetColumns(columnsConfig);

            // 初始化字段映射，自动映射一些常用字段
            const initialMappings: Record<string, string> = {};

            // 自动映射一些常见的字段
            const commonFields = ['operationName', 'duration', 'startTime'];
            commonFields.forEach(field => {
              // 查找是否有匹配的列名
              const matchingColumn = columnsConfig.find((col: any) =>
                col.name.toLowerCase().includes(field.toLowerCase()) ||
                field.toLowerCase().includes(col.name.toLowerCase())
              );

              if (matchingColumn) {
                initialMappings[field] = matchingColumn.name;
              }
            });

            setFieldMappings(initialMappings);
          } else {
            setDatasetColumns([]);
            setFieldMappings({});
          }
        } catch (parseError) {
          console.error('解析评测集列结构失败:', parseError);
          setDatasetColumns([]);
          setFieldMappings({});
        }
      } else {
        message.error('获取评测集详情失败');
        setDatasetColumns([]);
        setFieldMappings({});
      }
    } catch (error) {
      message.error('获取评测集详情失败');
      setDatasetColumns([]);
      setFieldMappings({});
    }
  }, []);

  // 处理添加到评测集按钮点击
  const handleAddToDataset = (span: Span) => {
    // 计算 aiAttr 和 otherAttr 数据
    const aiAttr = Object.entries(span?.attributes || {}).filter(([key, value]) => {
      return key.startsWith('gen_ai')
    }).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as any)

    const otherAttr = Object.entries(span?.attributes || {}).filter(([key, value]) => {
      return !key.startsWith('gen_ai')
    }).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as any)

    // 打印这两个数据
    console.log('aiAttr:', aiAttr);
    console.log('otherAttr:', otherAttr);

    // 解析 gen_ai.input.messages 和 gen_ai.output.messages 中的 content 字段
    let inputContents: string[] = [];
    let outputContents: string[] = [];

    try {
      if (aiAttr['gen_ai.input.messages']) {
        const inputMessages = JSON.parse(aiAttr['gen_ai.input.messages']);
        // input只处理 role 为 'user' 的消息
        inputContents = inputMessages.filter((message: any) => message.role === 'user').flatMap((message: any) =>
          message.parts ? message.parts.map((part: any) => part.content || part.text || '').filter(Boolean) : []
        );
      }
    } catch (error) {
      console.error('解析 gen_ai.input.messages 失败:', error);
    }

    try {
      if (aiAttr['gen_ai.output.messages']) {
        const outputMessages = JSON.parse(aiAttr['gen_ai.output.messages']);
        // output只处理 role 为 'assistant' 的消息
        outputContents = outputMessages
          .filter((message: any) => message.role === 'assistant')
          .flatMap((message: any) =>
            message.parts ? message.parts.map((part: any) => part.content || part.text || '').filter(Boolean) : []
          );
      }
    } catch (error) {
      console.error('解析 gen_ai.output.messages 失败:', error);
    }

    // 打印提取的 content 字段值
    console.log('inputContentValues:', inputContents);
    console.log('outputContentValues:', outputContents);

    // 提取 otherAttr 中 spring.ai.alibaba.prompt.variable 键名下的所有键值对
    const promptVariableValues: Record<string, any> = {};
    if (otherAttr['spring.ai.alibaba.prompt.variable']) {
      try {
        const promptVariables = JSON.parse(otherAttr['spring.ai.alibaba.prompt.variable']);
        Object.keys(promptVariables).forEach(key => {
          promptVariableValues[key] = promptVariables[key];
        });
      } catch (error) {
        console.error('解析 spring.ai.alibaba.prompt.variable 失败:', error);
      }
    }

    // 打印 promptVariableValues 中的所有键值对
    console.log('promptVariableValues:', promptVariableValues);

    // 保存数据到状态变量
    setInputContentValues(inputContents);
    setOutputContentValues(outputContents);
    setOtherAttrValues(promptVariableValues);

    setSelectedSpanForDataset(span);
    setAddToDatasetModalVisible(true);
    // 获取评测集列表
    fetchDatasets();
  };

  // 保存到数据集
  const handleSaveToDataset = async () => {
    if (!selectedSpanForDataset || !selectedDatasetId || !selectedDatasetVersionId) {
      message.error('请选择完整的评测集和版本信息');
      return;
    }

    // 检查是否有字段映射配置
    const hasMappings = Object.values(fieldMappings).some(mapping => mapping);
    if (!hasMappings) {
      message.warning('请至少配置一个字段映射关系');
      return;
    }

    try {
      // 构造要保存的数据内容
      const dataContent: Record<string, any> = {};

      // 根据字段映射关系构造数据
      Object.entries(fieldMappings).forEach(([spanField, datasetField]) => {
        if (datasetField) {
          // 处理基本字段
          if (spanField === 'operationName') {
            dataContent[datasetField] = selectedSpanForDataset.operationName;
          } else if (spanField === 'duration') {
            dataContent[datasetField] = selectedSpanForDataset.duration;
          } else if (spanField === 'startTime') {
            dataContent[datasetField] = selectedSpanForDataset.startTime;
          } else if (spanField === 'finishTime') {
            dataContent[datasetField] = selectedSpanForDataset.finishTime;
          }
          // 处理输入内容字段
          else if (spanField.startsWith('inputContent-')) {
            const index = parseInt(spanField.split('-')[1]);
            if (!isNaN(index) && inputContentValues[index]) {
              dataContent[datasetField] = inputContentValues[index];
            }
          }
          // 处理输出内容字段
          else if (spanField.startsWith('outputContent-')) {
            const index = parseInt(spanField.split('-')[1]);
            if (!isNaN(index) && outputContentValues[index]) {
              dataContent[datasetField] = outputContentValues[index];
            }
          }
          // 处理其他属性字段
          else if (spanField.startsWith('otherAttr-')) {
            const key = spanField.split('-').slice(1).join('-');
            if (otherAttrValues[key] !== undefined) {
              dataContent[datasetField] = otherAttrValues[key];
            }
          }
          // 处理属性字段
          else {
            if (selectedSpanForDataset.attributes && selectedSpanForDataset.attributes[spanField]) {
              dataContent[datasetField] = selectedSpanForDataset.attributes[spanField];
            }
          }
        }
      });

      // 检查构造的数据是否为空
      if (Object.keys(dataContent).length === 0) {
        message.warning('没有可保存的数据，请检查字段映射配置');
        return;
      }

      // 获取当前选中的数据集版本信息
      const selectedVersion = datasetVersions.find(v => v.id.toString() === selectedDatasetVersionId);
      const columnsConfig = selectedVersion?.columnsConfig || datasetColumns || [];

      // 创建数据项
      const response = await API.createDatasetDataItemFromTrace({
        datasetId: Number(selectedDatasetId),
        datasetVersionId: Number(selectedDatasetVersionId),
        dataContent: [JSON.stringify(dataContent)],
        columnsConfig: columnsConfig
      });

      if (response.code === 200) {
        message.success('已成功添加到评测集');
        setAddToDatasetModalVisible(false);
        // 重置状态
        setSelectedSpanForDataset(null);
        setSelectedDatasetId('');
        setSelectedDatasetVersionId('');
        setDatasetVersions([]);
        setDatasetColumns([]);
        setFieldMappings({});
        // 重置新添加的状态
        setInputContentValues([]);
        setOutputContentValues([]);
        setOtherAttrValues({});
      } else {
        message.error('添加到评测集失败: ' + (response.message || '未知错误'));
      }
    } catch (error: any) {
      message.error('添加到评测集失败: ' + (error.message || '网络错误或服务器异常'));
      console.error('添加到评测集失败:', error);
    }
  };

  // 关闭弹出框
  const handleCloseAddToDatasetModal = () => {
    setAddToDatasetModalVisible(false);
    // 重置状态
    setSelectedSpanForDataset(null);
    setSelectedDatasetId('');
    setSelectedDatasetVersionId('');
    setDatasetVersions([]);
    setDatasetColumns([]);
    setFieldMappings({});
    // 重置新添加的状态
    setInputContentValues([]);
    setOutputContentValues([]);
    setOtherAttrValues({});
  };

  // 设置全局函数供子组件调用
  useEffect(() => {
    (window as any).handleAddToDataset = handleAddToDataset;
    return () => {
      // 清理全局函数
      delete (window as any).handleAddToDataset;
    };
  }, []);

  const buildSpanTree = (spans: Span[]): Span[] => {
    const spanMap: Record<string, Span> = {};
    const roots: Span[] = [];

    spans.forEach(span => {
      span.children = [];
      spanMap[span.spanID] = span;
    });

    spans.forEach(span => {
      if (span.parentSpanID && spanMap[span.parentSpanID]) {
        spanMap[span.parentSpanID].children!.push(span);
      } else {
        roots.push(span);
      }
    });

    const sortSpans = (spanList: Span[]) => {
      spanList.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      spanList.forEach(s => sortSpans(s.children || []));
    };

    sortSpans(roots);
    return roots;
  };

  const showDrawer = async (trace: any) => {
    setSelectedTrace(trace);
    setDrawerVisible(true);
    setTraceDetailLoading(true);
    setSelectedSpan(null);
    try {
      // @ts-ignore
      const res = await API.observability.getTraceDetail({ traceId: trace.traceId });
      if (res.code === 200) {
        const apiSpans = res.data.records || [];
        const componentSpans: Span[] = apiSpans.map((s: any) => ({
          spanID: s.spanId,
          parentSpanID: s.parentSpanId,
          operationName: s.spanName,
          startTime: s.startTime,
          finishTime: s.endTime,
          duration: s.durationNs / 1000000,
          attributes: s.attributes,
          events: (s.spanEvents || []).map((e: any) => ({ name: e.name, timestamp: e.time, attributes: e.attributes })),
          kind: s.spanKind,
          status: { code: s.status },
          _original: s,
        }));

        const rootSpan = componentSpans.find(s => !s.parentSpanID);

        const traceDetailData = {
          traceID: trace.traceId,
          sourceType: rootSpan?._original.attributes['source.type'],
          serviceName: rootSpan?._original.service,
          status: rootSpan?._original.status,
          model: rootSpan?._original.attributes['llm.model'],
          tokenCount: rootSpan?._original.attributes['llm.token.total'],
          startTime: rootSpan?._original.startTime,
          duration: rootSpan ? rootSpan._original.durationNs / 1000000 : 0,
          prompt: rootSpan?._original.attributes['llm.prompt'],
          spans: componentSpans,
        };

        // 如果没有 root ， 则取第一个作为 root
        if (traceDetailData?.spans.some(v => v.parentSpanID === "")) { }
        else {
          traceDetailData.spans = traceDetailData.spans.map((v, i) => {
            if (i === 0) return {...v, parentSpanID: "", spanID: v.parentSpanID as string}
            return v
          })
        }
        setTraceDetail(traceDetailData);
        const tree = buildSpanTree(traceDetailData.spans || []);
        setSpanTree(tree);
        setSelectedSpan(tree[0] || null);
        setCollapsedSpans(new Set());
      } else {
        notifyError({ message: '获取Trace详情失败' });
      }
    } catch (error) {
      handleApiError(error, '获取Trace详情失败');
    } finally {
      setTraceDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setSelectedTrace(null);
    setTraceDetail(null);
    setSpanTree([]);
    setSelectedSpan(null);
    setCollapsedSpans(new Set());
  };

  // --- Render Methods ---

  const columns: ColumnType<any>[] = [
    {
      title: 'TraceID', dataIndex: 'traceId', key: 'traceId',
      width: "20%",
      ellipsis: true,
      render: (id: string) => {
        return (
          <Popover content={
            <Paragraph copyable={{ text: id }} >{id}</Paragraph>
          }>
            {id}
          </Popover>
        )
      }
    },
    {
      title: '来源类型',
      dataIndex: ['attributes', 'spring.ai.alibaba.studio.source'],
      key: 'sourceType',
      render: (type: string) => SOURCE_TYPE_MAP[type] || type || "-"
    },
    {
      title: '应用 / Span',
      key: 'service',
      width: "15%",
      render: (_: any, record: any) => {
        return (
          <div>
            <Popover
              content={record.service}
            >
              <div className='max-w-full overflow-hidden text-ellipsis whitespace-nowrap'>{record.service}</div>
            </Popover>
            <Popover
              content={record.spanName}
            >
              <div className='max-w-full overflow-hidden text-ellipsis whitespace-nowrap'>{record.spanName}</div>
            </Popover>
          </div>
        )
      }
    },
    {
      title: "输入/输出信息",
      dataIndex: "inputMessage",
      width: "22%",
      render: (_v: any, record: any) => {
        const attr = record.attributes || {};
        const inputPreview = extractMessagePreview(attr["gen_ai.input.messages"], 'user');
        const outputPreview = extractMessagePreview(attr["gen_ai.output.messages"], 'assistant');
        if (!inputPreview && !outputPreview && !attr["gen_ai.input.messages"]) {
          return <span className="trace-muted">—</span>;
        }
        return (
          <div className="trace-list-io" onClick={(e) => e.stopPropagation()}>
            <div className="trace-list-io-row">
              <span className="trace-list-io-label">In</span>
              <span className="trace-list-io-text" title={inputPreview || undefined}>
                {inputPreview || '—'}
              </span>
            </div>
            <div className="trace-list-io-row">
              <span className="trace-list-io-label">Out</span>
              <span className="trace-list-io-text" title={outputPreview || undefined}>
                {outputPreview || '—'}
              </span>
            </div>
          </div>
        );
      }
    },

    {
      title: 'Token',
      dataIndex: "inputtoken", key: 'inputToken',
      render: (_v: any, record: any) => {
        const attr = record.attributes;
        return (
          <Popover
            content={
              <div className='flex flex-col gap-1'>
                <div className='flex gap-2'><span className='inline-flex min-w-[48px]'>Input: </span>{attr?.["gen_ai.usage.input_tokens"] || "-"}</div>
                <div className='flex gap-2'><span className='inline-flex min-w-[48px]'>Output: </span>{attr?.["gen_ai.usage.output_tokens"] || "-"}</div>
                <div className='flex gap-2'><span className='inline-flex min-w-[48px]'>Total: </span>{attr?.["gen_ai.usage.total_tokens"] || "-"}</div>
              </div>
            }
          >
            <div className='flex flex-col gap-1'>
              <div className='flex gap-2'><span className='inline-flex min-w-[48px]'>Input: </span>{attr?.["gen_ai.usage.input_tokens"] || "-"}</div>
              <div className='flex gap-2'><span className='inline-flex min-w-[48px]'>Output: </span>{attr?.["gen_ai.usage.output_tokens"] || "-"}</div>
              <div className='flex gap-2'><span className='inline-flex min-w-[48px]'>Total: </span>{attr?.["gen_ai.usage.total_tokens"] || "-"}</div>
            </div>
          </Popover>
        )
        return
      }
    },
    {
      title: '模型',
      dataIndex: ['attributes', 'gen_ai.request.model'],
      key: 'model',
      ellipsis: true,
      render: (val: string) => <Popover content={val || '-'}>{val || '-'}</Popover>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        return <Tag color={STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP.default}>{status}</Tag>
      }
    },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime', render: (time: string) => formatDateTime(time) },
    {
      title: '持续时间',
      dataIndex: 'durationNs',
      key: 'duration',
      render: (ns: number) => formatDuration(ns / 1000000)
    },
    {
      title: '操作',
      key: 'action',
          render: (_: any, record: any) => (
        <Button type="link" onClick={(e) => {
          e.stopPropagation();
          showDrawer(record);
        }}>
          查看详情
        </Button>
      ),
    },
  ];

  const renderDrawerContent = () => {
    if (traceDetailLoading) return <div style={{ textAlign: 'center', padding: '48px 0' }}><Spin size="large" /></div>;
    if (!traceDetail) return <Empty description="无法加载Trace详情" />;

    if (traceDetail.duration === 0 || traceDetail.startTime === undefined) {
      const start = traceDetail.spans[0];
      traceDetail.duration = start.duration;
      traceDetail.startTime = start.startTime;
    }

    const traceStartTime = traceDetail.startTime ? new Date(traceDetail.startTime).getTime() : 0;
    const traceTotalDuration = traceDetail.duration || 1;

    const flattenedSpans = flattenTreeForWaterfall(spanTree, collapsedSpans);

    const aiAttr = Object.entries(selectedSpan?.attributes || {}).filter(([key, value]) => {
      return key.startsWith('gen_ai')
    }).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as any)

    const otherAttr = Object.entries(selectedSpan?.attributes || {}).filter(([key, value]) => {
      return !key.startsWith('gen_ai')
    }).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as any)

    return (
      <>
        <div className="trace-peek">
          <div className="trace-peek-nav">
            <div className="trace-peek-nav-header">
              <span>Spans</span>
              <span className="trace-muted">{formatDuration(traceTotalDuration)}</span>
            </div>
            <div className="span-waterfall-chart">
              <div className="span-waterfall-header">
                <span>Operation</span>
                <span>Timeline</span>
              </div>
              {spanTree.length > 0 ? (
                flattenedSpans.map(({ span, depth }) => (
                  <SpanWaterfallRow
                    key={span.spanID}
                    span={span}
                    depth={depth}
                    traceStartTime={traceStartTime}
                    traceTotalDuration={traceTotalDuration}
                    onSpanSelect={setSelectedSpan}
                    isSelected={selectedSpan?.spanID === span.spanID}
                    onToggleCollapse={toggleSpanCollapse}
                    isCollapsed={collapsedSpans.has(span.spanID)}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No spans in this trace.</div>
              )}
            </div>
          </div>

          <div className="trace-peek-detail">
            {selectedSpan ? (
              <>
                <div className="trace-peek-detail-header">
                  <div className="trace-peek-detail-title" title={selectedSpan.operationName}>
                    {selectedSpan.operationName}
                  </div>
                  <div className="trace-peek-detail-meta">
                    <Tag color={STATUS_COLOR_MAP[selectedSpan.status?.code] || STATUS_COLOR_MAP.default}>
                      {selectedSpan.status?.code || '—'}
                    </Tag>
                    <span className="trace-muted">{formatDuration(selectedSpan.duration)}</span>
                  </div>
                </div>
                <Tabs
                  className="trace-peek-tabs"
                  defaultActiveKey="preview"
                  items={[
                    {
                      key: 'preview',
                      label: 'Preview',
                      children: (
                        <div className="trace-peek-tab-body">
                          {selectedSpan.attributes?.['gen_ai.input.messages'] ? (
                            <PrettyJsonBlock
                              key={`${selectedSpan.spanID}-input`}
                              title="Input"
                              data={selectedSpan.attributes['gen_ai.input.messages']}
                            />
                          ) : null}
                          {selectedSpan.attributes?.['gen_ai.output.messages'] ? (
                            <PrettyJsonBlock
                              key={`${selectedSpan.spanID}-output`}
                              title="Output"
                              data={selectedSpan.attributes['gen_ai.output.messages']}
                            />
                          ) : null}
                          {!selectedSpan.attributes?.['gen_ai.input.messages'] &&
                          !selectedSpan.attributes?.['gen_ai.output.messages'] ? (
                            <Empty description="该 Span 无 Input / Output" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          ) : null}
                          <div className="trace-meta-grid">
                            <div><Text type="secondary">SpanId</Text><div className="trace-mono">{selectedSpan.spanID}</div></div>
                            <div><Text type="secondary">Kind</Text><div>{selectedSpan.kind || '—'}</div></div>
                            <div><Text type="secondary">Start</Text><div>{formatDateTime(selectedSpan.startTime)}</div></div>
                            <div><Text type="secondary">End</Text><div>{formatDateTime(selectedSpan.finishTime)}</div></div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'metadata',
                      label: 'Metadata',
                      children: (
                        <div className="trace-peek-tab-body">
                          <div className="trace-io-block">
                            <div className="trace-io-block-title">AI attributes</div>
                            <div className="trace-attr-list">
                              {Object.keys(aiAttr).length ? (
                                Object.entries(aiAttr).map(([key, value]) => (
                                  <AttrRow key={key} name={key} value={value} />
                                ))
                              ) : (
                                <div className="trace-muted p-3">无 AI 属性</div>
                              )}
                            </div>
                          </div>
                          <div className="trace-io-block">
                            <div className="trace-io-block-title">Other attributes</div>
                            <div className="trace-attr-list">
                              {Object.keys(otherAttr).length ? (
                                Object.entries(otherAttr).map(([key, value]) => (
                                  <AttrRow key={key} name={key} value={value} />
                                ))
                              ) : (
                                <div className="trace-muted p-3">无其他属性</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'events',
                      label: 'Events',
                      children: (
                        <div className="trace-peek-tab-body">
                          {selectedSpan.events?.length > 0 ? (
                            <Timeline>
                              {selectedSpan.events.map((event, index) => (
                                <Timeline.Item key={index}>
                                  <p><strong>{event.name}</strong> - {formatDateTime(event.timestamp)}</p>
                                  <PrettyJsonBlock title="attributes" data={event.attributes || {}} maxHeight={200} />
                                </Timeline.Item>
                              ))}
                            </Timeline>
                          ) : (
                            <Empty description="暂无事件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
              </>
            ) : (
              <div className="trace-peek-empty">
                <Empty description="请选择一个 Span 查看详情" />
              </div>
            )}
          </div>
        </div>

        {/* 添加到评测集弹出框 */}
        <Modal
          title="添加到评测集"
          open={addToDatasetModalVisible}
          onCancel={handleCloseAddToDatasetModal}
          width={800}
          style={{ maxHeight: 'calc(100vh - 40px)' }}
          bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
          footer={[
            <Button key="cancel" onClick={handleCloseAddToDatasetModal}>
              取消
            </Button>,
            <Button key="save" type="primary" onClick={handleSaveToDataset}>
              保存到数据集
            </Button>
          ]}
        >
          {selectedSpanForDataset && (
            <div>
              {/* Span信息展示 */}
              <Card title="Span信息" size="small" className="mb-4">
                <Row gutter={[12, 12]}>
                  <Col span={12}><Text strong>名称:</Text> {selectedSpanForDataset?.operationName || '-'}</Col>
                  <Col span={12}><Text strong>SpanId:</Text> {selectedSpanForDataset?.spanID || '-'}</Col>
                  <Col span={12}><Text strong>类型:</Text> {selectedSpan?.kind || '-'}</Col>
                  <Col span={12}><Text strong>服务:</Text> {traceDetail?.serviceName || '-'}</Col>
                </Row>
              </Card>

              {/* 评测集选择 */}
              <Card title="选择评测集" size="small" className="mb-4">
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Form.Item
                      label="评测集"
                      required
                      className="mb-0"
                    >
                      <Select
                        placeholder="请选择评测集"
                        loading={datasetsLoading}
                        value={selectedDatasetId || undefined}
                        onChange={handleDatasetChange}
                        showSearch
                        optionFilterProp="children"
                      >
                        {datasets.map(dataset => (
                          <Select.Option key={dataset.id} value={dataset.id}>
                            {dataset.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="版本"
                      required
                      className="mb-0"
                    >
                      <Select
                        placeholder="请选择版本"
                        loading={datasetVersionsLoading}
                        value={selectedDatasetVersionId || undefined}
                        onChange={handleDatasetVersionChange}
                        disabled={!selectedDatasetId}
                        showSearch
                        optionFilterProp="children"
                      >
                        {datasetVersions.map(version => (
                          <Select.Option key={version.id} value={version.id.toString()}>
                            {version.version} - {version.description}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* 评测集列结构展示和字段映射配置 */}
              {(selectedDatasetId && selectedDatasetVersionId) && (
                <Card title="字段映射配置" size="small">
                  <div className="mb-3">
                    <Text strong>评测集列结构 (版本 {datasetVersions.find(v => v.id.toString() === selectedDatasetVersionId)?.version || selectedDatasetVersionId}):</Text>
                    {datasetColumns.length > 0 ? (
                      <div className="mt-2">
                        {datasetColumns.map((column: any) => (
                          <Tag key={column.name} color="blue" className="mr-2 mb-2">
                            {column.name}
                          </Tag>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <Text type="secondary">暂无列结构信息</Text>
                      </div>
                    )}
                  </div>

                  {datasetColumns.length > 0 && (
                    <div>
                      <Text strong>字段映射:</Text>
                      <div className="mt-2">
                        {/* 根据Span数据结构动态生成映射项 */}
                        <div className="bg-gray-50 p-3 rounded">
                          {selectedSpanForDataset && (
                            <>

                              {/* 输入内容字段映射 */}
                              {inputContentValues.map((content, index) => (
                                <div className="mb-3" key={`input-${index}`}>
                                  <Row gutter={[8, 8]} align="middle">
                                    <Col span={11}>
                                      <Input
                                        placeholder="输入内容"
                                        value={content}
                                        onChange={(e) => {
                                          const newValues = [...inputContentValues];
                                          newValues[index] = e.target.value;
                                          setInputContentValues(newValues);
                                        }}
                                      />
                                    </Col>
                                    <Col span={2} className="text-center">
                                      <span>→</span>
                                    </Col>
                                    <Col span={11}>
                                      <Select
                                        placeholder="映射到评测集字段"
                                        style={{ width: '100%' }}
                                        value={fieldMappings[`inputContent-${index}`] || undefined}
                                        onChange={(value) => handleFieldMappingChange(`inputContent-${index}`, value)}
                                      >
                                        {datasetColumns.map((column: any) => (
                                          <Select.Option key={column.name} value={column.name}>
                                            {column.name}
                                          </Select.Option>
                                        ))}
                                      </Select>
                                    </Col>
                                  </Row>
                                </div>
                              ))}

                              {/* 输出内容字段映射 */}
                              {outputContentValues.map((content, index) => (
                                <div className="mb-3" key={`output-${index}`}>
                                  <Row gutter={[8, 8]} align="middle">
                                    <Col span={11}>
                                      <Input
                                        placeholder="输出内容"
                                        value={content}
                                        onChange={(e) => {
                                          const newValues = [...outputContentValues];
                                          newValues[index] = e.target.value;
                                          setOutputContentValues(newValues);
                                        }}
                                      />
                                    </Col>
                                    <Col span={2} className="text-center">
                                      <span>→</span>
                                    </Col>
                                    <Col span={11}>
                                      <Select
                                        placeholder="映射到评测集字段"
                                        style={{ width: '100%' }}
                                        value={fieldMappings[`outputContent-${index}`] || undefined}
                                        onChange={(value) => handleFieldMappingChange(`outputContent-${index}`, value)}
                                      >
                                        {datasetColumns.map((column: any) => (
                                          <Select.Option key={column.name} value={column.name}>
                                            {column.name}
                                          </Select.Option>
                                        ))}
                                      </Select>
                                    </Col>
                                  </Row>
                                </div>
                              ))}

                              {/* 其他属性字段映射 */}
                              {Object.entries(otherAttrValues).map(([key, value]) => (
                                <div className="mb-3" key={`other-${key}`}>
                                  <Row gutter={[8, 8]} align="middle">
                                    <Col span={11}>
                                      <Input
                                        placeholder="其他属性"
                                        value={typeof value === 'object' ? JSON.stringify(value) : value}
                                        onChange={(e) => {
                                          setOtherAttrValues(prev => ({
                                            ...prev,
                                            [key]: e.target.value
                                          }));
                                        }}
                                      />
                                    </Col>
                                    <Col span={2} className="text-center">
                                      <span>→</span>
                                    </Col>
                                    <Col span={11}>
                                      <Select
                                        placeholder="映射到评测集字段"
                                        style={{ width: '100%' }}
                                        value={fieldMappings[`otherAttr-${key}`] || undefined}
                                        onChange={(value) => handleFieldMappingChange(`otherAttr-${key}`, value)}
                                      >
                                        {datasetColumns.map((column: any) => (
                                          <Select.Option key={column.name} value={column.name}>
                                            {column.name}
                                          </Select.Option>
                                        ))}
                                      </Select>
                                    </Col>
                                  </Row>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </Modal>
      </>
    );
  };

  useEffect(() => {
    fetchTraces();
  }, [pagination.current, pagination.pageSize])

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        链路追踪
        {filteredPromptName && (
          <Tag color="blue" closable onClose={handleClearPromptFilter} style={{ marginLeft: 8, verticalAlign: 'middle' }}>
            Prompt: {filteredPromptName}
          </Tag>
        )}
      </Title>
      <Card style={{ marginBottom: 24 }}>
        <Row>
          <Col span={8}>
              <RangePicker
                showTime style={{ width: '100%' }}
                value={timeRange as any}
                onChange={(times) => {
                  if (times) {
                    setTimeRange(times as any);
                  }
                }}
              />
          </Col>
        </Row>
      </Card>
      <Form form={form} onFinish={onSearch}>
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title="Trace 总数" value={overviewData?.['operation.count']?.total} loading={overviewLoading} />
            </Col>
            <Col span={8}>
              <Statistic title="Token 消耗" value={overviewData?.['usage.tokens']?.total} loading={overviewLoading} />
            </Col>
            <Col span={8}>
              <Statistic title="模型调用次数" value={overviewData?.['operation.count']?.total} loading={overviewLoading} />
            </Col>
          </Row>
        </Card>

        <Card style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={6}>
              <Form.Item name="serviceName" label="来源应用">
                <Select showSearch placeholder="全部" allowClear>
                  {services.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            {
              serviceName === "spring-ai-alibaba-studio" && (
                <Col span={6}>
                  <Form.Item name="sourceType" label="来源类型">
                    <Select placeholder="全部" allowClear>
                      <Option value="prompt">Prompt</Option>
                      <Option value="playground">Playground</Option>
                      <Option value="evaluator">评估器</Option>
                      <Option value="experiment">实验</Option>
                    </Select>
                  </Form.Item>
                </Col>
              )
            }
            <Col span={6}>
              <Form.Item name="spanName" label="Span名称">
                <Select showSearch placeholder="全部" allowClear>
                  {operations.map(op => <Option key={op} value={op}>{op}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="traceId" label="TraceId">
                <Input placeholder="输入TraceId" />
              </Form.Item>
            </Col>
            <Col span={6} className="flex gap-2 justify-end">
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
              <Button className='mr-2' onClick={() => {
               form.resetFields();
               onSearch();
               navigate('/tracing', { replace: true });
              }}>重置</Button>
            </Col>
          </Row>
          <Form.List name="advancedFilters">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...restField} name={[name, 'key']} rules={[{ required: true, message: '请选择属性' }]}>
                      <Input placeholder='属性' width={200} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'value']} rules={[{ required: true, message: '请输入属性值' }]}>
                      <Input placeholder="属性值" width={200} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item className='mb-0'>
                  <Button
                    type="dashed"
                    onClick={() => add()} block icon={<PlusOutlined />}
                  >
                    添加高级筛选
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Card>
      </Form>
      <Card>
        <Table
          columns={columns}
          dataSource={traces}
          loading={loading}
          scroll={{x: 1300}}
          pagination={{
            ...pagination,
            onChange: onPaginationChange,
            onShowSizeChange: onShowSizeChange
          }}
          rowKey="spanId"
          onRow={(record) => ({
            onClick: () => showDrawer(record),
            className: selectedTrace?.traceId === record.traceId ? 'trace-row-active' : undefined,
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
      <Drawer
        className="trace-peek-drawer"
        title={
          <div className='flex items-center flex-wrap gap-2'>
            <span>Trace</span>
            <Paragraph className='!mb-0' copyable={{ text: traceDetail?.traceID || selectedTrace?.traceId }}>
              {traceDetail?.traceID || selectedTrace?.traceId || '—'}
            </Paragraph>
          </div>
        }
        width="78%"
        onClose={closeDrawer}
        open={drawerVisible}
        destroyOnHidden
        styles={{ body: { padding: 0, height: 'calc(100% - 55px)', overflow: 'hidden' } }}
      >
        {renderDrawerContent()}
      </Drawer>
    </div>
  );
}

export default TracingPage;
