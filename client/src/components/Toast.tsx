import type { Toast as ToastData } from "../types";
export function Toast({toast}:{toast:ToastData}){return toast?<div className={`toast ${toast.type}`} role="status">{toast.message}</div>:null}
