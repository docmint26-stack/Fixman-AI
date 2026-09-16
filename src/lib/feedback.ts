import { toast } from "@/components/ui/toast";

export const notify = {
  success(title: string, description?: string) {
    toast.add({ type: "success", title, description, timeout: 4200 });
  },
  info(title: string, description?: string) {
    toast.add({ type: "info", title, description, timeout: 4200 });
  },
  warning(title: string, description?: string) {
    toast.add({ type: "warning", title, description, timeout: 5200 });
  },
  error(title: string, description?: string) {
    toast.add({ type: "error", title, description, timeout: 6000 });
  },
  loading(title: string, description?: string): () => void {
    const id = toast.add({ type: "loading", title, description, timeout: 0 });
    return () => toast.close(id);
  },
};