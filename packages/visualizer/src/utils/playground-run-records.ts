import type {
  ExecutionOptions,
  FormValue,
  PlaygroundRunRecord,
  PlaygroundYamlExportResult,
} from '../types';

function quoteYamlString(value: string): string {
  return JSON.stringify(value);
}

function dumpScalar(value: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (typeof value === 'string') return quoteYamlString(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => `${pad}- ${dumpScalar(item, indent + 2)}`)
      .join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries
      .map(([key, item]) => `${pad}${key}: ${dumpScalar(item, indent + 2)}`)
      .join('\n');
  }
  return quoteYamlString(String(value));
}

export function createRunRecord(input: {
  id: string;
  value: FormValue;
  executionOptions: ExecutionOptions;
  status: PlaygroundRunRecord['status'];
  result?: PlaygroundRunRecord['result'];
}): PlaygroundRunRecord {
  return {
    id: input.id,
    actionType: input.value.type,
    prompt: input.value.prompt,
    params: input.value.params,
    executionOptions: input.executionOptions,
    status: input.status,
    result: input.result,
    createdAt: new Date().toISOString(),
  };
}

function flowFromRecord(record: PlaygroundRunRecord): {
  flow?: Record<string, unknown>;
  warning?: string;
} {
  const params = record.params || {};
  switch (record.actionType) {
    case 'aiAct':
      return record.prompt
        ? { flow: { aiAct: record.prompt } }
        : { warning: 'aiAct without a prompt cannot be exported.' };
    case 'aiTap':
      return record.prompt
        ? { flow: { aiTap: record.prompt } }
        : { warning: 'aiTap without a prompt cannot be exported.' };
    case 'aiAssert':
      return record.prompt
        ? { flow: { aiAssert: record.prompt } }
        : { warning: 'aiAssert without a prompt cannot be exported.' };
    case 'aiWaitFor':
      return record.prompt
        ? { flow: { aiWaitFor: record.prompt } }
        : { warning: 'aiWaitFor without a prompt cannot be exported.' };
    case 'aiQuery':
    case 'aiBoolean':
    case 'aiNumber':
    case 'aiString':
    case 'aiAsk':
      return record.prompt
        ? { flow: { [record.actionType]: record.prompt } }
        : {
            warning: `${record.actionType} without a prompt cannot be exported.`,
          };
    case 'aiInput':
    case 'aiKeyboardPress':
    case 'aiScroll':
    case 'aiDoubleClick':
    case 'aiHover':
    case 'aiRightClick':
      return {
        flow: {
          [record.actionType]: record.prompt || '',
          ...params,
        },
      };
    default:
      if (record.prompt || Object.keys(params).length > 0) {
        return {
          flow: {
            [record.actionType]: record.prompt || '',
            ...params,
          },
        };
      }
      return {
        warning: `${record.actionType} has no prompt or parameters and cannot be exported.`,
      };
  }
}

export function exportRunRecordsToYaml(input: {
  records: PlaygroundRunRecord[];
  webUrl?: string;
  name?: string;
}): PlaygroundYamlExportResult {
  const warnings: string[] = [];
  const flows: Record<string, unknown>[] = [];

  for (const record of input.records) {
    const converted = flowFromRecord(record);
    if (converted.flow) {
      flows.push(converted.flow);
    }
    if (converted.warning) {
      warnings.push(converted.warning);
    }
  }

  const lines = [
    'web:',
    `  url: ${quoteYamlString(input.webUrl || 'about:blank')}`,
    'tasks:',
    `  - name: ${quoteYamlString(input.name || 'Playground sequence')}`,
    '    flow:',
  ];

  if (flows.length === 0) {
    lines.push('      []');
  } else {
    for (const flow of flows) {
      const [key, value] = Object.entries(flow)[0];
      const rest = Object.entries(flow).slice(1);
      lines.push(`      - ${key}: ${dumpScalar(value, 8)}`);
      for (const [restKey, restValue] of rest) {
        lines.push(`        ${restKey}: ${dumpScalar(restValue, 8)}`);
      }
    }
  }

  return {
    yaml: `${lines.join('\n')}\n`,
    warnings,
    exportableCount: flows.length,
  };
}

export function downloadTextFile(
  content: string,
  filename: string,
  type = 'text/plain',
): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
