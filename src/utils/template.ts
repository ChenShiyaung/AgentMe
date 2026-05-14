/**
 * 替换模板中的 {{variable}} 占位符。
 * 未在 variables 中提供的变量保持原样。
 */
const PLACEHOLDER_RE = /\{\{([a-zA-Z_]\w*)\}\}/g;

export function renderTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(PLACEHOLDER_RE, (full, name: string) => {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      return variables[name]!;
    }
    return full;
  });
}
