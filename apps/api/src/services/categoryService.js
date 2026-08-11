import { AppError } from '../helpers/AppError.js';
import { slugify } from '../helpers/slugify.js';
import * as defaultRepository from '../repositories/categoryRepository.js';

export function createCategoryService(repository = defaultRepository) {
  const getById = async (id) => {
    const category = await repository.findById(id);
    if (!category) throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
    return category;
  };

  return {
    list: (filters) => repository.list(filters),
    getById,
    create: (data) => repository.create({ ...data, slug: data.slug ?? slugify(data.name) }),
    update: async (id, data) => {
      await getById(id);
      const updated = await repository.update(id, data);
      return updated;
    },
    deactivate: async (id) => {
      await getById(id);
      return repository.deactivate(id);
    },
  };
}

export const categoryService = createCategoryService();
