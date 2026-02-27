import useSWR from "swr";

interface Template {
  id: string;
  title: string;
  description: string | null;
  content: string;
  category: string;
  sort_order: number;
}

interface TemplatesApiResponse {
  templates: Template[];
}

export function useTemplates() {
  const { data, error, isLoading } =
    useSWR<TemplatesApiResponse>("/api/templates");

  return {
    templates: data?.templates ?? [],
    error,
    isLoading,
  };
}
