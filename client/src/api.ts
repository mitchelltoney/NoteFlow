import axios from 'axios';
import type { Page, Block } from '@noteflow/shared';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001' });

export const fetchPages = async (): Promise<Page[]> => {
  const { data } = await api.get('/pages');
  return data;
};

export const fetchPage = async (id: string): Promise<Page> => {
  const { data } = await api.get(`/pages/${id}`);
  return data;
};

export const createPage = async (body: { title?: string; icon?: string | null; parentId?: string | null }) => {
  const { data } = await api.post('/pages', body);
  return data as Page;
};

export const updatePage = async (id: string, body: Partial<{ title: string; icon: string | null; parentId: string | null; position: number }>) => {
  const { data } = await api.patch(`/pages/${id}`, body);
  return data as Page;
};

export const deletePage = async (id: string) => {
  await api.delete(`/pages/${id}`);
};

export const createBlock = async (pageId: string, body: {
  type?: string;
  content?: string;
  checked?: boolean;
  language?: string | null;
  position: number;
  parentBlockId?: string | null;
}) => {
  const { data } = await api.post(`/pages/${pageId}/blocks`, body);
  return data as Block;
};

export const updateBlock = async (id: string, body: Partial<{
  type: string;
  content: string;
  checked: boolean;
  language: string | null;
  position: number;
  parentBlockId: string | null;
}>) => {
  const { data } = await api.patch(`/blocks/${id}`, body);
  return data as Block;
};

export const deleteBlock = async (id: string) => {
  await api.delete(`/blocks/${id}`);
};

export const reorderBlocks = async (blocks: { id: string; position: number; parentBlockId?: string | null }[]) => {
  const { data } = await api.post('/blocks/reorder', { blocks });
  return data;
};
