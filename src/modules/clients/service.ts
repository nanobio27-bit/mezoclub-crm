// src/modules/clients/service.ts
// Бизнес-логика клиентов

import { ClientRepository } from './repository';
import { ClientListParams } from './types';
import { Client, CreateClientDto, UpdateClientDto, PaginationMeta } from '../../shared/types/common';
import { AppError } from '../../shared/middleware/error-handler';

export class ClientService {
  constructor(private repo: ClientRepository) {}

  /** Получить список клиентов с пагинацией и фильтрами */
  async getAll(params: ClientListParams): Promise<{ data: Client[]; meta: PaginationMeta }> {
    return this.repo.findAllWithManager(params);
  }

  /** Получить клиента по ID */
  async getById(id: number, tenantId: number): Promise<Client> {
    const client = await this.repo.findByIdWithManager(id, tenantId);
    if (!client) {
      throw new AppError(404, 'NOT_FOUND', 'Клиент не найден');
    }
    return client;
  }

  /** Создать нового клиента */
  async create(data: CreateClientDto, tenantId: number): Promise<Client> {
    const clientData = {
      ...data,
      tenantId,
    };
    const created = await this.repo.create(clientData as Partial<Client>);
    return this.repo.findByIdWithManager(created.id, tenantId) as Promise<Client>;
  }

  /** Обновить клиента */
  async update(id: number, data: UpdateClientDto, tenantId: number): Promise<Client> {
    // Проверяем существование
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Клиент не найден');
    }

    await this.repo.update(id, data as Partial<Client>);
    return this.repo.findByIdWithManager(id, tenantId) as Promise<Client>;
  }

  /** Мягкое удаление клиента */
  async delete(id: number, tenantId: number): Promise<void> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Клиент не найден');
    }

    const deleted = await this.repo.softDelete(id);
    if (!deleted) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Не удалось удалить клиента');
    }
  }
}
