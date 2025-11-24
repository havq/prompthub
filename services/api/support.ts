
import { SupportTicket, TicketMessage } from '../../utils/types';
import { fetchApi, mapItem, mapItems } from './core';

export const getTickets = (userId?: string): Promise<SupportTicket[]> => {
    const endpoint = userId ? `&userId=${userId}` : '';
    return fetchApi<SupportTicket[]>('support_tickets', endpoint).then(mapItems);
};

export const getTicket = (id: string): Promise<SupportTicket> => {
    return fetchApi<SupportTicket>('support_tickets', `&id=${id}`).then(mapItem);
};

export const createTicket = (data: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'messages'>): Promise<SupportTicket> => {
    return fetchApi<SupportTicket>('support_tickets', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
};

export const updateTicketStatus = (id: string, status: SupportTicket['status']): Promise<void> => {
    return fetchApi<void>('support_tickets', `&id=${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
};

export const deleteTicket = (id: string): Promise<void> => {
    return fetchApi<void>('support_tickets', `&id=${id}`, { method: 'DELETE' });
};

export const getTicketMessages = (ticketId: string): Promise<TicketMessage[]> => {
    return fetchApi<TicketMessage[]>('support_messages', `&ticketId=${ticketId}`).then(mapItems);
};

export const sendTicketMessage = (data: Omit<TicketMessage, 'id' | 'createdAt'>): Promise<TicketMessage> => {
    return fetchApi<TicketMessage>('support_messages', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
};