import { AppError } from '../helpers/AppError.js';
import { slugify } from '../helpers/slugify.js';
import * as defaultRepository from '../repositories/productRepository.js';

export function createProductService(repository = defaultRepository) {
  const getById = async (id) => {
    const product = await repository.findById(id);
    if (!product) throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    return product;
  };

  const assertCategory = async (categoryId) => {
    if (!(await repository.categoryExists(categoryId))) {
      throw new AppError('La categoría no existe o está inactiva', 400, 'INVALID_CATEGORY');
    }
  };

  const assertProduct = async (productId) => getById(productId);
  const ensureResult = (result, resource) => {
    if (!result) throw new AppError(`${resource} no encontrado`, 404, 'NESTED_RESOURCE_NOT_FOUND');
    return result;
  };

  return {
    list: (filters) => repository.list(filters),
    getById,
    create: async (data) => {
      await assertCategory(data.category_id);
      return repository.create({ ...data, slug: data.slug ?? slugify(data.name) });
    },
    update: async (id, data) => {
      await getById(id);
      if (data.category_id) await assertCategory(data.category_id);
      return repository.update(id, data);
    },
    remove: async (id) => {
      await getById(id);
      return repository.softDelete(id);
    },
    createVariant: async (productId, data, adminUserId) => {
      await assertProduct(productId);
      return repository.createVariant(productId, { ...data, admin_user_id: adminUserId });
    },
    updateVariant: async (productId, id, data) => {
      await assertProduct(productId);
      return ensureResult(await repository.updateVariant(productId, id, data), 'Variante');
    },
    removeVariant: async (productId, id) => {
      await assertProduct(productId);
      return ensureResult(await repository.deactivateVariant(productId, id), 'Variante');
    },
    adjustStock: async (productId, id, data, adminUserId) => {
      await assertProduct(productId);
      return ensureResult(await repository.adjustStock(productId, id, {
        newStock: data.new_stock,
        adminUserId,
        note: data.note,
      }), 'Variante');
    },
    createImage: async (productId, data) => {
      await assertProduct(productId);
      return repository.createImage(productId, data);
    },
    updateImage: async (productId, id, data) => {
      await assertProduct(productId);
      return ensureResult(await repository.updateImage(productId, id, data), 'Imagen');
    },
    removeImage: async (productId, id) => {
      await assertProduct(productId);
      return ensureResult(await repository.deleteImage(productId, id), 'Imagen');
    },
    createPersonalization: async (productId, data) => {
      await assertProduct(productId);
      return repository.createPersonalization(productId, data);
    },
    updatePersonalization: async (productId, id, data) => {
      await assertProduct(productId);
      return ensureResult(await repository.updatePersonalization(productId, id, data), 'Personalización');
    },
    removePersonalization: async (productId, id) => {
      await assertProduct(productId);
      return ensureResult(await repository.deactivatePersonalization(productId, id), 'Personalización');
    },
  };
}

export const productService = createProductService();
