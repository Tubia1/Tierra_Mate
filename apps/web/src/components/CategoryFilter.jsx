export function CategoryFilter({ categories, value, onChange }) {
  return (
    <div className="category-filter" aria-label="Filtrar por categoría">
      <button className={value === '' ? 'is-active' : ''} type="button" onClick={() => onChange('')}>Todos</button>
      {categories.map((category) => (
        <button
          className={String(value) === String(category.id) ? 'is-active' : ''}
          key={category.id}
          type="button"
          onClick={() => onChange(String(category.id))}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
