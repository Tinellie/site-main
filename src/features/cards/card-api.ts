export async function cardRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(response.status === 401
      ? "登录已过期，请在新标签页重新登录后重试；当前编辑内容已保留。"
      : payload.message || "操作失败，请重试。");
  }
  return payload as T;
}
