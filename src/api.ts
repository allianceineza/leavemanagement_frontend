const API_URL = "http://localhost:5000/api";

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && localStorage.getItem("token")) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("fullName");
    window.location.href = "/login";
  }
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data as T;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: buildHeaders() });
  return handle<T>(res);
}
export async function downloadFile(path: string, filename: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { headers: buildHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
export async function postForm<T>(path: string, body: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers, body });
  return handle<T>(res);
}

export async function openFile(path: string): Promise<void> {
  // Open the tab first, while the click is still fresh, so pop-up blockers allow it
  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Please allow pop-ups for this site to view documents.");
  }
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: buildHeaders() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Could not open the file");
    }
    const blob = await res.blob();
    win.location.href = URL.createObjectURL(blob);
  } catch (err) {
    win.close();
    throw err;
  }
}