import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Node, NodeWithLinks, InsertNode, NodeLink, InsertNodeLink } from "@shared/schema";

interface UseNodesOptions {
  type?: string;
  createdBy?: number;
  limit?: number;
}

export function useNodes(options: UseNodesOptions = {}) {
  const queryParams = new URLSearchParams();
  
  if (options.type) queryParams.append('type', options.type);
  if (options.createdBy) queryParams.append('createdBy', options.createdBy.toString());
  if (options.limit) queryParams.append('limit', options.limit.toString());
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return useQuery<Node[]>({
    queryKey: ['/api/nodes', { type: options.type, createdBy: options.createdBy, limit: options.limit }],
    queryFn: () => fetch(`/api/nodes${queryString}`).then(res => res.json()),
  });
}

export function useNode(id: number) {
  return useQuery<NodeWithLinks>({
    queryKey: [`/api/nodes/${id}`],
    enabled: !!id,
  });
}

export function useCreateNode(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (node: InsertNode) => 
      apiRequest('/api/nodes', { 
        method: 'POST', 
        body: JSON.stringify(node) 
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'], exact: false });
    },
  });
}

export function useUpdateNode(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertNode> }) => 
      apiRequest(`/api/nodes/${id}`, { 
        method: 'PATCH', 
        body: JSON.stringify(data) 
      }).then(res => res.json()),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/nodes/${variables.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'], exact: false });
    },
  });
}

export function useDeleteNode(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/nodes/${id}`, { method: 'DELETE' })
        .then(res => res.text()),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [`/api/nodes/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'], exact: false });
    },
  });
}

export function useNodeLinks(nodeId: number) {
  return useQuery<NodeLink[]>({
    queryKey: [`/api/nodes/${nodeId}/links`],
    enabled: !!nodeId,
  });
}

export function useCreateNodeLink(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (link: InsertNodeLink) => 
      apiRequest('POST', '/api/node-links', link)
        .then(res => res.json()),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/nodes/${variables.sourceId}/links`] });
      queryClient.invalidateQueries({ queryKey: [`/api/nodes/${variables.targetId}/links`] });
    },
  });
}
