// src/pages/ProductCatalogPage.tsx
// v3.0 - Cleaned, optimized, cart-ready catalog page

import React, { useState, useEffect, useCallback } from 'react';
import { productApi } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import './ProductCatalog.css';

interface Product {
  _id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  category: string;
  rating: { average: number; count: number };
  inventory: { availableStock: number };
}

interface ProductCatalogPageProps {
  onAddToCart?: (product: Product) => void;
  onViewProduct?: (productId: string) => void;
}

export const ProductCatalogPage: React.FC<ProductCatalogPageProps> = ({
  onAddToCart,
  onViewProduct,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    category: '',
    search: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });

  /* =============================
     Load Categories
  ============================== */
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await productApi.getCategories();
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, []);

  /* =============================
     Load Products
  ============================== */
  const loadProducts = useCallback(async () => {
    setLoading(true);

    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.minPrice) params.minPrice = Number(filters.minPrice);
      if (filters.maxPrice) params.maxPrice = Number(filters.maxPrice);

      const data = await productApi.getAll(params);

      setProducts(data.products || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /* =============================
     Handlers
  ============================== */

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));

    setPagination(prev => ({
      ...prev,
      page: 1,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      category: '',
      search: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    setPagination(prev => ({
      ...prev,
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.pages) return;

    setPagination(prev => ({
      ...prev,
      page: newPage,
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* =============================
     Render
  ============================== */

  return (
    <div className="catalog-page">
      {/* Header */}
      <div className="catalog-header">
        <div className="catalog-title-section">
          <h1>Shop All Products</h1>
          <p className="catalog-subtitle">
            Discover our collection of {pagination.total} products
          </p>
        </div>
      </div>

      <div className="catalog-container">
        {/* Sidebar */}
        <aside className="catalog-sidebar">
          <div className="filter-section">
            <div className="filter-header">
              <h3>Filters</h3>
              <button
                className="btn-clear-filters"
                onClick={handleClearFilters}
              >
                Clear
              </button>
            </div>

            {/* Search */}
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) =>
                  handleFilterChange('search', e.target.value)
                }
                className="filter-search"
              />
            </div>

            {/* Category */}
            <div className="filter-group">
              <label>Category</label>
              <select
                value={filters.category}
                onChange={(e) =>
                  handleFilterChange('category', e.target.value)
                }
                className="filter-select"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div className="filter-group">
              <label>Price Range</label>
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) =>
                    handleFilterChange('minPrice', e.target.value)
                  }
                  className="price-input"
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    handleFilterChange('maxPrice', e.target.value)
                  }
                  className="price-input"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="filter-group">
              <label>Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  handleFilterChange('sortBy', e.target.value)
                }
                className="filter-select"
              >
                <option value="createdAt">Newest</option>
                <option value="price">Price: Low to High</option>
                <option value="-price">Price: High to Low</option>
                <option value="name">Name: A-Z</option>
                <option value="-rating.average">Highest Rated</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="catalog-main">
          <div className="results-header">
            <p className="results-count">
              Showing {products.length} of {pagination.total} products
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading products...</p>
            </div>
          )}

          {/* Grid */}
          {!loading && products.length > 0 && (
            <div className="product-grid">
              {products.map(product => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onAddToCart={onAddToCart}
                  onViewDetails={() =>
                    onViewProduct?.(product._id)
                  }
                />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && products.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No products found</h3>
              <p>Try adjusting your filters.</p>
              <button
                className="btn-primary"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() =>
                  handlePageChange(pagination.page - 1)
                }
                disabled={pagination.page === 1}
              >
                ← Previous
              </button>

              <div className="pagination-pages">
                {Array.from(
                  { length: Math.min(pagination.pages, 5) },
                  (_, i) => {
                    const pageNum = i + 1;

                    return (
                      <button
                        key={pageNum}
                        className={`pagination-page ${
                          pageNum === pagination.page
                            ? 'active'
                            : ''
                        }`}
                        onClick={() =>
                          handlePageChange(pageNum)
                        }
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                className="pagination-btn"
                onClick={() =>
                  handlePageChange(pagination.page + 1)
                }
                disabled={
                  pagination.page === pagination.pages
                }
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
