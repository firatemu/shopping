/**
 * prisma.middleware.spec.ts — Soft Delete Middleware Unit Tests
 *
 * Tests that the softDeleteMiddleware correctly:
 * 1. Injects isDeleted: false on findUnique, findFirst, findMany, count
 * 2. Converts hard delete to soft delete (isDeleted: true, deletedAt set)
 * 3. Converts deleteMany to updateMany with soft delete fields
 * 4. Skips non-soft-delete models entirely
 */

import { softDeleteMiddleware } from './prisma.middleware';

describe('softDeleteMiddleware', () => {
  const mockNext = jest.fn().mockResolvedValue('next_result');

  beforeEach(() => {
    mockNext.mockClear();
  });

  describe('model not in SOFT_DELETE_MODELS', () => {
    it('should pass params through unchanged', async () => {
      const params = {
        model: 'SomeOtherModel',
        action: 'findMany',
        args: { where: { foo: 'bar' } },
      };
      const middleware = softDeleteMiddleware();
      const result = await middleware(params as any, mockNext);
      expect(result).toBe('next_result');
      expect(mockNext).toHaveBeenCalledWith(params);
    });
  });

  describe('findUnique → findFirst with isDeleted: false', () => {
    it('should inject isDeleted: false and change action to findFirst', async () => {
      const params = { model: 'Product', action: 'findUnique', args: { where: { id: '123' } } };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'findFirst',
          args: expect.objectContaining({ where: { id: '123', isDeleted: false } }),
        }),
      );
    });

    it('should preserve existing where clause and add isDeleted: false', async () => {
      const params = { model: 'Product', action: 'findUnique', args: { where: { name: 'Test' } } };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({ where: { name: 'Test', isDeleted: false } }),
        }),
      );
    });
  });

  describe('findMany', () => {
    it('should inject isDeleted: false when where is undefined', async () => {
      const params = { model: 'Product', action: 'findMany', args: {} };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ args: expect.objectContaining({ where: { isDeleted: false } }) }),
      );
    });

    it('should inject isDeleted: false when where clause is empty', async () => {
      const params = { model: 'Product', action: 'findMany', args: { where: {} } };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ args: expect.objectContaining({ where: { isDeleted: false } }) }),
      );
    });

    it('should not override explicit isDeleted filter', async () => {
      const params = { model: 'Product', action: 'findMany', args: { where: { isDeleted: true } } };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      // Explicit filter must be preserved — middleware must not override user intent
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ args: expect.objectContaining({ where: { isDeleted: true } }) }),
      );
    });

    it('should preserve existing non-isDeleted where clauses', async () => {
      const params = {
        model: 'Product',
        action: 'findMany',
        args: { where: { category: 'Shirts' } },
      };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({ where: { category: 'Shirts', isDeleted: false } }),
        }),
      );
    });
  });

  describe('count', () => {
    it('should inject isDeleted: false with no existing where', async () => {
      const params = { model: 'Product', action: 'count', args: {} };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ args: expect.objectContaining({ where: { isDeleted: false } }) }),
      );
    });

    it('should preserve existing where and add isDeleted: false', async () => {
      const params = { model: 'Product', action: 'count', args: { where: { category: 'Pants' } } };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({ where: { category: 'Pants', isDeleted: false } }),
        }),
      );
    });
  });

  describe('delete → update (soft delete)', () => {
    it('should convert delete action to update with isDeleted: true and deletedAt', async () => {
      const params = { model: 'Product', action: 'delete', args: { where: { id: '123' } } };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          args: expect.objectContaining({
            where: { id: '123' },
            data: expect.objectContaining({
              isDeleted: true,
              deletedAt: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('deleteMany → updateMany (soft delete)', () => {
    it('should convert deleteMany to updateMany with soft delete data', async () => {
      const params = {
        model: 'Product',
        action: 'deleteMany',
        args: { where: { category: 'Old' } },
      };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'updateMany',
          args: expect.objectContaining({
            where: { category: 'Old' },
            data: expect.objectContaining({
              isDeleted: true,
              deletedAt: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should handle deleteMany with no existing data', async () => {
      const params = { model: 'Product', action: 'deleteMany', args: { where: {} } };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'updateMany',
          args: expect.objectContaining({
            data: expect.objectContaining({
              isDeleted: true,
              deletedAt: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('all SOFT_DELETE_MODELS coverage', () => {
    const models = [
      'User',
      'Product',
      'ProductVariant',
      'Order',
      'OrderItem',
      'Campaign',
      'ProductCategory',
      'ProductBrand',
      'ProductColor',
      'SizeSet',
      'StockMovement',
      'GiftVoucher',
      'Customer',
      'LedgerMovement',
      'BankAccount',
      'BankAccountMovement',
      'PartnerFinanceOperation',
      'CashRegisterSession',
      'CashRegisterAdjustment',
      'Expense',
      'Notification',
      'Branch',
      'StockTransfer',
      'StockTransferItem',
      'Integration',
      'LabelTemplate',
      'Tenant',
      'RefreshToken',
    ];

    it.each(models)('model %s should be handled by middleware (findMany)', async (model) => {
      const params = { model, action: 'findMany', args: {} };
      const middleware = softDeleteMiddleware();
      await middleware(params as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ args: expect.objectContaining({ where: { isDeleted: false } }) }),
      );
    });
  });
});
