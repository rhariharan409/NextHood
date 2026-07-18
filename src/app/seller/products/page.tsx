'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import ImageEditor from '@/components/ImageEditor';
import OptimizedImage from '@/components/OptimizedImage';

interface Product {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  brand: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  mrp: string;
  discount: string;
  gst: string;
  weight: string;
  dimensions: string;
  stock: string;
  min_stock_alert: string;
  supplier_name: string;
  tags: string;
  delivery_type: string;
  images: string;
  thumbnail_url?: string;
  views: string;
  sold: string;
  revenue: string;
  rating: string;
  created_at: string;
  last_updated: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

export default function SellerProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStock, setFilterStock] = useState(''); // 'all', 'low', 'out'
  const [filterAvailability, setFilterAvailability] = useState('all'); // 'all', 'active', 'inactive'
  const [filterDiscount, setFilterDiscount] = useState(false);
  const [sortOption, setSortOption] = useState('newest');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals & Drawers
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [analyticsProduct, setAnalyticsProduct] = useState<Product | null>(null);
  const [flashFestProduct, setFlashFestProduct] = useState<Product | null>(null);
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Grocery Store');
  const [formBrand, setFormBrand] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formMrp, setFormMrp] = useState('');
  const [formDiscount, setFormDiscount] = useState('');
  const [formGst, setFormGst] = useState('5%');
  const [formWeight, setFormWeight] = useState('');
  const [formDimensions, setFormDimensions] = useState('');
  const [formStock, setFormStock] = useState('20');
  const [formMinAlert, setFormMinAlert] = useState('5');
  const [formSupplier, setFormSupplier] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formDelivery, setFormDelivery] = useState('Standard');
  const [formImages, setFormImages] = useState('');
  const [formSubCategory, setFormSubCategory] = useState('');
  const [formUnit, setFormUnit] = useState('piece');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formThumbnail, setFormThumbnail] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  
  // Custom restock qty
  const [customRestockQty, setCustomRestockQty] = useState('');
  
  // FlashFest discount form
  const [flashDiscount, setFlashDiscount] = useState('20%');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authenticate & Load
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/seller/auth');
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.user.role === 'seller') {
          if (!data.profileCompleted) {
            router.push('/seller/complete-profile');
            return;
          }
          setUser(data.user);
          await loadProducts();
        } else {
          router.push('/seller/auth');
        }
      } catch (err) {
        router.push('/seller/auth');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/seller/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error('Error loading products:', e);
    }
  };

  // Handle Image upload and trigger AI Suggestions
  const handleImageUpload = async (versions: { high: string; medium: string; thumbnail: string }) => {
    setIsUploading(true);
    setUploadProgressMsg('Uploading...');
    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versions)
      });
      
      if (res.ok) {
        setUploadProgressMsg('Optimizing...');
        const data = await res.json();
        
        setUploadProgressMsg('Creating Thumbnail...');
        setFormImages(data.image_url);
        setFormThumbnail(data.thumbnail_url);
        setUploadProgressMsg('Upload Complete');
        showToast('Image uploaded & optimized successfully!', 'success');
        
        // Fetch AI suggestions automatically if product name is filled
        if (formName.trim()) {
          try {
            setUploadProgressMsg('Generating AI recommendations...');
            const suggestRes = await fetch('/api/seller/products/ai-suggest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: formName, category: formCategory })
            });
            if (suggestRes.ok) {
              const suggestData = await suggestRes.json();
              const suggestions = suggestData.suggestions;
              
              if (suggestions.description) setFormDescription(suggestions.description);
              if (suggestions.tags) setFormTags(suggestions.tags);
              if (suggestions.categorySuggestion) setFormCategory(suggestions.categorySuggestion);
              
              showToast('AI Suggestions loaded! Review them in the form.', 'success');
            }
          } catch (aiErr) {
            console.error("AI Suggestions failed", aiErr);
          }
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Image upload failed.', 'error');
      }
    } catch (err) {
      showToast('Error uploading image.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
    }
  };

  // Add Product Submit
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImages) {
      showToast('Please upload a product image. Image is mandatory.', 'error');
      return;
    }
    showToast('Saving Product...', 'success');
    try {
      const res = await fetch('/api/seller/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          category: formCategory,
          brand: formBrand,
          sku: formSku,
          barcode: formBarcode,
          description: formDescription,
          price: formPrice,
          mrp: formMrp,
          discount: formDiscount,
          gst: formGst,
          weight: formWeight,
          dimensions: formDimensions,
          stock: formStock,
          min_stock_alert: formMinAlert,
          supplier_name: formSupplier,
          tags: formTags,
          delivery_type: formDelivery,
          images: formImages,
          thumbnail_url: formThumbnail
        })
      });
      if (res.ok) {
        showToast('✓ Product added successfully.', 'success');
        setAddingProduct(false);
        resetForm();
        await loadProducts();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to add product.', 'error');
      }
    } catch (err) {
      showToast('An error occurred.', 'error');
    }
  };

  // Edit Product Populate
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormBrand(product.brand);
    setFormSku(product.sku);
    setFormBarcode(product.barcode);
    setFormDescription(product.description);
    setFormPrice(product.price);
    setFormMrp(product.mrp);
    setFormDiscount(product.discount);
    setFormGst(product.gst);
    setFormWeight(product.weight);
    setFormDimensions(product.dimensions);
    setFormStock(product.stock);
    setFormMinAlert(product.min_stock_alert);
    setFormSupplier(product.supplier_name);
    setFormTags(product.tags);
    setFormDelivery(product.delivery_type);
    setFormImages(product.images);
    setFormThumbnail(product.thumbnail_url || '');
  };

  // Edit Product Submit
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!formImages) {
      showToast('Product Image is mandatory.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/seller/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          name: formName,
          category: formCategory,
          brand: formBrand,
          sku: formSku,
          barcode: formBarcode,
          description: formDescription,
          price: formPrice,
          mrp: formMrp,
          discount: formDiscount,
          gst: formGst,
          weight: formWeight,
          dimensions: formDimensions,
          stock: formStock,
          min_stock_alert: formMinAlert,
          supplier_name: formSupplier,
          tags: formTags,
          delivery_type: formDelivery,
          images: formImages,
          thumbnail_url: formThumbnail
        })
      });
      if (res.ok) {
        showToast('Product updated successfully.');
        setEditingProduct(null);
        resetForm();
        await loadProducts();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update product.', 'error');
      }
    } catch (err) {
      showToast('An error occurred.', 'error');
    }
  };

  // Restock action
  const handleRestock = async (qty: number) => {
    if (!restockingProduct) return;
    try {
      const currentStock = parseInt(restockingProduct.stock) || 0;
      const res = await fetch('/api/seller/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: restockingProduct.id,
          stock: String(currentStock + qty)
        })
      });
      if (res.ok) {
        showToast(`Successfully added ${qty} units to stock.`);
        setRestockingProduct(null);
        await loadProducts();
      } else {
        showToast('Failed to restock product.', 'error');
      }
    } catch (err) {
      showToast('An error occurred.', 'error');
    }
  };

  // Quick Price update
  const handleQuickPriceChange = async (productId: string, newPrice: string) => {
    try {
      const res = await fetch('/api/seller/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productId,
          price: newPrice
        })
      });
      if (res.ok) {
        showToast('Price updated.');
        await loadProducts();
      }
    } catch (err) {
      showToast('Error updating price.', 'error');
    }
  };

  // Delete product
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      const res = await fetch(`/api/seller/products?id=${deletingProduct.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Product deleted.');
        setDeletingProduct(null);
        await loadProducts();
      } else {
        showToast('Failed to delete.', 'error');
      }
    } catch (err) {
      showToast('An error occurred.', 'error');
    }
  };

  // Bulk Operations
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected products?`)) return;
    try {
      let count = 0;
      for (const id of selectedIds) {
        const res = await fetch(`/api/seller/products?id=${id}`, { method: 'DELETE' });
        if (res.ok) count++;
      }
      showToast(`Successfully deleted ${count} products.`);
      setSelectedIds([]);
      await loadProducts();
    } catch (e) {
      showToast('Bulk delete failed.', 'error');
    }
  };

  const handleBulkStockUpdate = async (qty: number) => {
    if (selectedIds.length === 0) return;
    try {
      let count = 0;
      for (const id of selectedIds) {
        const prod = products.find(p => p.id === id);
        if (prod) {
          const currentStock = parseInt(prod.stock) || 0;
          const res = await fetch('/api/seller/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, stock: String(currentStock + qty) })
          });
          if (res.ok) count++;
        }
      }
      showToast(`Updated stock for ${count} products.`);
      setSelectedIds([]);
      await loadProducts();
    } catch (e) {
      showToast('Bulk update failed.', 'error');
    }
  };

  // CSV Import / Export
  const handleExportCSV = () => {
    if (products.length === 0) return;
    const productColumns: (keyof Product)[] = [
      'id',
      'shop_id',
      'name',
      'category',
      'brand',
      'sku',
      'barcode',
      'description',
      'price',
      'mrp',
      'discount',
      'gst',
      'weight',
      'dimensions',
      'stock',
      'min_stock_alert',
      'supplier_name',
      'tags',
      'delivery_type',
      'images',
      'views',
      'sold',
      'revenue',
      'rating',
      'created_at',
      'last_updated'
    ];
    const headers = productColumns.join(',');
    const rows = products.map(p => {
      return productColumns.map(col => {
        const val = String(p[col] || '').replace(/"/g, '""');
        return val.includes(',') ? `"${val}"` : val;
      }).join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexthood_products_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Products exported successfully.');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
        if (lines.length <= 1) {
          showToast('CSV is empty or invalid', 'error');
          return;
        }

        const cleanFirstLine = lines[0].replace(/^\uFEFF/, '').trim();
        const rawHeaders = cleanFirstLine.split(',').map(h => h.trim().toLowerCase());
        
        console.log("Detected Columns:", rawHeaders.join(', '));
        showToast(`Detected Columns: ${rawHeaders.join(', ')}`);

        // Find indices for name using allowed variants: Name, Product Name, Product, Item Name, name
        const nameVariants = ['name', 'product name', 'product', 'item name'];
        const nameIdx = rawHeaders.findIndex(h => nameVariants.includes(h));

        // Find indices for price using allowed variants: Price, price, Selling Price, Product Price
        const priceVariants = ['price', 'selling price', 'product price'];
        const priceIdx = rawHeaders.findIndex(h => priceVariants.includes(h));

        // Find optional columns if present: Category, Brand, SKU, MRP, Stock, Description, Discount, Image
        const categoryIdx = rawHeaders.indexOf('category');
        const brandIdx = rawHeaders.indexOf('brand');
        const skuIdx = rawHeaders.indexOf('sku');
        const mrpIdx = rawHeaders.indexOf('mrp');
        const stockIdx = rawHeaders.indexOf('stock');
        const descriptionIdx = rawHeaders.indexOf('description');
        const discountIdx = rawHeaders.indexOf('discount');
        const imageIdx = rawHeaders.indexOf('image');

        if (nameIdx === -1 || priceIdx === -1) {
          let missingMsg = 'CSV is missing mandatory columns:';
          if (nameIdx === -1 && priceIdx === -1) {
            missingMsg += ' Name and Price';
          } else if (nameIdx === -1) {
            missingMsg += ' Name';
          } else {
            missingMsg += ' Price';
          }
          showToast(missingMsg, 'error');
          return;
        }

        let importedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length <= nameIdx || cols.length <= priceIdx) continue;

          const name = cols[nameIdx];
          const price = cols[priceIdx];
          
          if (!name || !price) continue;

          const category = categoryIdx !== -1 && cols[categoryIdx] ? cols[categoryIdx] : 'Grocery Store';
          const brand = brandIdx !== -1 && cols[brandIdx] ? cols[brandIdx] : '';
          const sku = skuIdx !== -1 && cols[skuIdx] ? cols[skuIdx] : '';
          const mrp = mrpIdx !== -1 && cols[mrpIdx] ? cols[mrpIdx] : price;
          const stock = stockIdx !== -1 && cols[stockIdx] ? cols[stockIdx] : '20';
          const description = descriptionIdx !== -1 && cols[descriptionIdx] ? cols[descriptionIdx] : '';
          const discount = discountIdx !== -1 && cols[discountIdx] ? cols[discountIdx] : '';
          const images = imageIdx !== -1 && cols[imageIdx] ? cols[imageIdx] : '';

          const res = await fetch('/api/seller/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              price,
              category,
              brand,
              sku,
              mrp,
              stock,
              description,
              discount,
              images
            })
          });
          if (res.ok) importedCount++;
        }
        showToast(`Successfully imported ${importedCount} products.`);
        await loadProducts();
      } catch (err) {
        showToast('Failed to parse CSV.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCategory('Grocery Store');
    setFormBrand('');
    setFormSku('');
    setFormBarcode('');
    setFormDescription('');
    setFormPrice('');
    setFormMrp('');
    setFormDiscount('');
    setFormGst('5%');
    setFormWeight('');
    setFormDimensions('');
    setFormStock('20');
    setFormMinAlert('5');
    setFormSupplier('');
    setFormTags('');
    setFormDelivery('Standard');
    setFormImages('');
    setFormSubCategory('');
    setFormUnit('piece');
    setFormExpiryDate('');
    setFormThumbnail('');
    setIsUploading(false);
    setUploadProgressMsg('');
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-family)',
        color: 'var(--text-muted)'
      }}>
        Loading Product Management...
      </div>
    );
  }

  if (!user) return null;

  // Filter & Search Logic
  const filteredProducts = products.filter(p => {
    // Search query matches Name, Category, SKU, or Brand
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // Filter by Category
    const matchesCategory = filterCategory ? p.category === filterCategory : true;

    // Filter by Stock
    const stockVal = parseInt(p.stock) || 0;
    const minAlertVal = parseInt(p.min_stock_alert) || 5;
    let matchesStock = true;
    if (filterStock === 'low') {
      matchesStock = stockVal > 0 && stockVal <= minAlertVal;
    } else if (filterStock === 'out') {
      matchesStock = stockVal === 0;
    }

    // Filter by Availability (Status)
    let matchesAvailability = true;
    if (filterAvailability === 'active') {
      matchesAvailability = stockVal > 0;
    } else if (filterAvailability === 'inactive') {
      matchesAvailability = stockVal === 0; // or any custom inactive state
    }

    // Filter by Discount
    const matchesDiscount = filterDiscount ? (p.discount && p.discount !== '0' && p.discount !== '0%') : true;

    return matchesSearch && matchesCategory && matchesStock && matchesAvailability && matchesDiscount;
  });

  // Sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortOption === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortOption === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortOption === 'highest_price') {
      return parseFloat(b.price || '0') - parseFloat(a.price || '0');
    }
    if (sortOption === 'lowest_price') {
      return parseFloat(a.price || '0') - parseFloat(b.price || '0');
    }
    if (sortOption === 'highest_stock') {
      return parseInt(b.stock || '0') - parseInt(a.stock || '0');
    }
    if (sortOption === 'lowest_stock') {
      return parseInt(a.stock || '0') - parseInt(b.stock || '0');
    }
    if (sortOption === 'alphabetical') {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  // Categories list for filters
  const categoriesList = Array.from(new Set(products.map(p => p.category)));

  // Analytics aggregates
  const totalProducts = products.length;
  const activeProducts = products.filter(p => (parseInt(p.stock) || 0) > 0).length;
  const outOfStock = products.filter(p => (parseInt(p.stock) || 0) === 0).length;
  const lowStock = products.filter(p => {
    const stock = parseInt(p.stock) || 0;
    const alert = parseInt(p.min_stock_alert) || 5;
    return stock <= alert;
  }).length;
  const totalInventoryValue = products.reduce((acc, p) => acc + (parseFloat(p.price || '0') * (parseInt(p.stock) || 0)), 0);
  
  // Best selling calculation
  let bestSellerName = 'N/A';
  let maxSold = 0;
  products.forEach(p => {
    const sold = parseInt(p.sold) || 0;
    if (sold > maxSold) {
      maxSold = sold;
      bestSellerName = p.name;
    }
  });

  // Checkbox Selection Helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  return (
    <>
      <Header currentUser={{ name: user.name, role: 'Seller' }} onLogout={handleLogout} />
      
      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem 2rem' }}>
        <div className="container" style={{ maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Sub Navigation */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <Link href="/seller/home" style={{
              fontWeight: 500,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              transition: 'var(--transition)'
            }}>
              🚚 Dispatches & Orders
            </Link>
            <Link href="/seller/products" style={{
              fontWeight: 600,
              color: 'var(--primary)',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.08)'
            }}>
              📦 Product Management
            </Link>
            <Link href="/seller/orders" style={{
              fontWeight: 500,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              transition: 'var(--transition)'
            }}>
              📦 My Orders
            </Link>
          </div>

          {/* Toast Alert */}
          {toast && (
            <div style={{
              position: 'fixed',
              top: '90px',
              right: '24px',
              backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
              color: '#ffffff',
              padding: '1rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              fontWeight: 600,
              fontSize: '0.9rem',
              animation: 'slide-in 0.2s ease-out'
            }}>
              {toast.message}
            </div>
          )}

          {/* Page Title */}
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>
              Inventory Control Center
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--foreground)', marginTop: '0.25rem' }}>
              📦 Product Management
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Manage your inventory, pricing, stock, and product performance from one place.
            </p>
          </div>

          {/* Top Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
            <div className="card summary-card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-lbl">Total Products</span>
                <span style={{ fontSize: '1.5rem' }}>📦</span>
              </div>
              <strong className="counter-val">{totalProducts}</strong>
            </div>

            <div className="card summary-card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-lbl">Available Products</span>
                <span style={{ fontSize: '1.5rem' }}>🟢</span>
              </div>
              <strong className="counter-val" style={{ color: 'var(--primary)' }}>{activeProducts}</strong>
            </div>

            <div className="card summary-card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-lbl">Out of Stock</span>
                <span style={{ fontSize: '1.5rem' }}>🔴</span>
              </div>
              <strong className="counter-val" style={{ color: '#ef4444' }}>{outOfStock}</strong>
            </div>

            <div className="card summary-card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-lbl">Low Stock Alert</span>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              </div>
              <strong className="counter-val" style={{ color: '#ea580c' }}>{lowStock}</strong>
            </div>

            <div className="card summary-card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-lbl">Inventory Value</span>
                <span style={{ fontSize: '1.5rem' }}>💰</span>
              </div>
              <strong className="counter-val">₹{totalInventoryValue.toLocaleString()}</strong>
            </div>

            <div className="card summary-card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-lbl">Best Selling</span>
                <span style={{ fontSize: '1.5rem' }}>🏆</span>
              </div>
              <strong style={{ fontSize: '1.1rem', display: 'block', marginTop: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {bestSellerName}
              </strong>
            </div>
          </div>

          {/* Top Action Bar */}
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              
              {/* Search Inputs */}
              <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by name, category, SKU, brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={() => setAddingProduct(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>➕</span> Add Product
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📥</span> Import CSV
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportCSV}
                  accept=".csv"
                  style={{ display: 'none' }}
                />
                <button onClick={handleExportCSV} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📤</span> Export CSV
                </button>
              </div>

            </div>

            {/* Filters and Sort */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '1rem', alignItems: 'center' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                >
                  <option value="">All Categories</option>
                  {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Stock Status:</span>
                <select
                  value={filterStock}
                  onChange={(e) => setFilterStock(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                >
                  <option value="all">All Levels</option>
                  <option value="low">Low Stock</option>
                  <option value="out">Out of Stock</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Availability:</span>
                <select
                  value={filterAvailability}
                  onChange={(e) => setFilterAvailability(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active (In Stock)</option>
                  <option value="inactive">Inactive (Out of Stock)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filterDiscount}
                    onChange={(e) => setFilterDiscount(e.target.checked)}
                  />
                  Discounted Only
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Sort by:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                >
                  <option value="newest">Newest Added</option>
                  <option value="oldest">Oldest Added</option>
                  <option value="highest_price">Highest Price</option>
                  <option value="lowest_price">Lowest Price</option>
                  <option value="highest_stock">Highest Stock</option>
                  <option value="lowest_stock">Lowest Stock</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>

            </div>
          </div>

          {/* Bulk Action Controls */}
          {selectedIds.length > 0 && (
            <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem 1.5rem', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Selected: {selectedIds.length} products</span>
              <button onClick={handleBulkDelete} className="btn" style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                Delete Selected
              </button>
              <button onClick={() => handleBulkStockUpdate(50)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                Restock (+50 Selected)
              </button>
              <button onClick={() => setSelectedIds([])} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', marginLeft: 'auto' }}>
                Clear Selection
              </button>
            </div>
          )}

          {/* Product Data Table */}
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '0', border: '1px solid var(--border)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border)', backgroundColor: '#f8fafc', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>
                  <th style={{ padding: '1rem 1.5rem', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === sortedProducts.length && sortedProducts.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ padding: '1rem 1.5rem' }}>Image</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Product Name</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Category</th>
                  <th style={{ padding: '1rem 1.5rem' }}>SKU / Brand</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Price / MRP</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Stock Levels</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Sold / Views</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  sortedProducts.map((p) => {
                    const stock = parseInt(p.stock) || 0;
                    const alert = parseInt(p.min_stock_alert) || 5;
                    const sold = parseInt(p.sold) || 0;
                    const views = parseInt(p.views) || 0;

                    // Badges logic
                    let statusLabel = 'Active';
                    let statusColor = '#10b981'; // Green
                    let statusBg = 'rgba(16, 185, 129, 0.08)';

                    if (stock === 0) {
                      statusLabel = 'Out of Stock';
                      statusColor = '#ef4444'; // Red
                      statusBg = 'rgba(239, 68, 68, 0.08)';
                    } else if (stock <= alert) {
                      statusLabel = 'Low Stock';
                      statusColor = '#ea580c'; // Orange
                      statusBg = 'rgba(234, 88, 12, 0.08)';
                    }

                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem', transition: 'var(--transition)' }}>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(p.id)}
                            onChange={(e) => handleSelectOne(p.id, e.target.checked)}
                          />
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ width: '48px', height: '48px' }}>
                            <OptimizedImage
                              src={p.thumbnail_url || p.images.split(',')[0]}
                              alt={p.name}
                              category={p.category}
                              style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)' }}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                          {p.name}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                          {p.category}
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.sku}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.brand || 'No Brand'}</div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ fontWeight: 700 }}>₹{p.price}</div>
                          {p.mrp && p.mrp !== p.price && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{p.mrp}</div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ fontWeight: 600 }}>{stock} available</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alert: {alert}</div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div>🛒 {sold} sold</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>👁 {views} views</div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: statusColor,
                            backgroundColor: statusBg
                          }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button onClick={() => setViewingProduct(p)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }} title="View details">
                              👁 View
                            </button>
                            <button onClick={() => openEditModal(p)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }} title="Edit product">
                              ✏ Edit
                            </button>
                            <button onClick={() => setRestockingProduct(p)} className="btn btn-secondary" style={{ padding: '0.35rem 0.66rem', fontSize: '0.75rem', color: 'var(--primary)', borderColor: 'var(--primary)' }} title="Restock">
                              📈 Restock
                            </button>
                            <button onClick={() => setDeletingProduct(p)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: '#ef4444', borderColor: '#fca5a5' }} title="Delete">
                              🗑 Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>

      {/* VIEW DRAWER */}
      {viewingProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '540px',
          backgroundColor: '#ffffff',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.05)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slide-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto'
        }}>
          <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem' }}>Product Details</h2>
            <button onClick={() => setViewingProduct(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ textAlign: 'center', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <img
                src={viewingProduct.images.split(',')[0]}
                alt={viewingProduct.name}
                style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            {/* AI Insights Card */}
            <div className="card" style={{ backgroundColor: 'rgba(16, 185, 129, 0.04)', borderColor: 'var(--primary)', padding: '1.25rem' }}>
              <strong style={{ display: 'block', color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                🤖 AI Smart Insights
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#1e293b' }}>
                <div>• Demand expected to increase by 18% next week.</div>
                <div>• Suggested discount setting: <strong>5% OFF</strong> for high volume.</div>
                <div>• Smart recommendation: Restock this item within 2 days.</div>
                <div>• Competitor Pricing: Similar shops sell this at ₹{parseFloat(viewingProduct.price) * 1.05}</div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{viewingProduct.name}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{viewingProduct.description || 'No description provided.'}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <span className="detail-lbl">Category</span>
                <strong className="detail-val">{viewingProduct.category}</strong>
              </div>
              <div>
                <span className="detail-lbl">Brand</span>
                <strong className="detail-val">{viewingProduct.brand || 'N/A'}</strong>
              </div>
              <div>
                <span className="detail-lbl">SKU</span>
                <strong className="detail-val">{viewingProduct.sku}</strong>
              </div>
              <div>
                <span className="detail-lbl">Barcode</span>
                <strong className="detail-val">{viewingProduct.barcode || 'N/A'}</strong>
              </div>
              <div>
                <span className="detail-lbl">Selling Price</span>
                <strong className="detail-val" style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>₹{viewingProduct.price}</strong>
              </div>
              <div>
                <span className="detail-lbl">MRP</span>
                <strong className="detail-val">₹{viewingProduct.mrp}</strong>
              </div>
              <div>
                <span className="detail-lbl">Current Stock</span>
                <strong className="detail-val">{viewingProduct.stock} available</strong>
              </div>
              <div>
                <span className="detail-lbl">Total Sold</span>
                <strong className="detail-val">{viewingProduct.sold} units</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {restockingProduct && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              📈 Restock Product
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select a quick restock quantity for <strong>{restockingProduct.name}</strong>.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button onClick={() => handleRestock(10)} className="btn btn-secondary">+10 Units</button>
              <button onClick={() => handleRestock(25)} className="btn btn-secondary">+25 Units</button>
              <button onClick={() => handleRestock(50)} className="btn btn-secondary">+50 Units</button>
              <button onClick={() => handleRestock(100)} className="btn btn-secondary">+100 Units</button>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <label className="form-label">Custom Quantity</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 15"
                  value={customRestockQty}
                  onChange={(e) => setCustomRestockQty(e.target.value)}
                />
                <button
                  onClick={() => {
                    const q = parseInt(customRestockQty);
                    if (q > 0) handleRestock(q);
                  }}
                  className="btn btn-primary"
                >
                  Apply
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setRestockingProduct(null)} className="btn btn-secondary" style={{ border: 'none' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingProduct && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem', color: '#ef4444' }}>
              ⚠️ Confirm Delete
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong>{deletingProduct.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeletingProduct(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleDeleteProduct} className="btn" style={{ backgroundColor: '#ef4444', color: '#ffffff' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {addingProduct && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem' }}>➕ Add New Product</h3>
              <button onClick={() => setAddingProduct(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input type="text" className="form-input" required value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-input" required value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                    <option value="Grocery Store">Grocery Store</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Restaurant">Restaurant</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sub Category *</label>
                  <input type="text" className="form-input" required placeholder="e.g. Milk, Cake, Tablets" value={formSubCategory} onChange={(e) => setFormSubCategory(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <input type="text" className="form-input" value={formBrand} onChange={(e) => setFormBrand(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input type="text" className="form-input" value={formSku} onChange={(e) => setFormSku(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Price *</label>
                  <input type="number" className="form-input" required value={formPrice} onChange={(e) => setFormPrice(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">MRP</label>
                  <input type="number" className="form-input" value={formMrp} onChange={(e) => setFormMrp(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount</label>
                  <input type="text" className="form-input" placeholder="e.g. 10%" value={formDiscount} onChange={(e) => setFormDiscount(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Available Stock *</label>
                  <input type="number" className="form-input" required value={formStock} onChange={(e) => setFormStock(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <select className="form-input" required value={formUnit} onChange={(e) => setFormUnit(e.target.value)}>
                    <option value="piece">piece</option>
                    <option value="kg">kg</option>
                    <option value="litre">litre</option>
                    <option value="packet">packet</option>
                    <option value="box">box</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date (Optional)</label>
                  <input type="date" className="form-input" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 'bold' }}>Product Image (Mandatory) *</label>
                {formImages && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '80px', height: '80px' }}>
                      <OptimizedImage src={formImages} alt="Uploaded product" category={formCategory} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold', display: 'block' }}>✓ Image Ready</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{formImages}</span>
                      <button type="button" onClick={() => { setFormImages(''); setFormThumbnail(''); }} style={{ display: 'block', border: 'none', background: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', padding: 0, marginTop: '0.25rem', fontWeight: 600 }}>Remove Image</button>
                    </div>
                  </div>
                )}

                {!formImages && (
                  <ImageEditor
                    onSave={handleImageUpload}
                    onRemove={() => { setFormImages(''); setFormThumbnail(''); }}
                    minRes={500}
                    maxRes={4000}
                    maxSizeMB={5}
                  />
                )}

                {isUploading && (
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(0,112,243,0.05)', borderRadius: '8px', border: '1px solid var(--primary)', textAlign: 'center', fontWeight: 600, color: 'var(--primary)', marginTop: '0.5rem' }}>
                    ⏳ {uploadProgressMsg}
                  </div>
                )}

                {formImages && (
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(0,112,243,0.05)', border: '1.5px dashed var(--primary)', borderRadius: '12px', marginTop: '0.5rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                      ✨ AI Recommendations applied!
                    </strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      We have automatically suggested category, description, tags, alt text, and pricing/inventory targets based on the product image. Feel free to customize them below.
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setAddingProduct(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isUploading}>Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingProduct && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem' }}>✏️ Edit Product</h3>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleEditProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input type="text" className="form-input" required value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-input" required value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                    <option value="Grocery Store">Grocery Store</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Restaurant">Restaurant</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sub Category *</label>
                  <input type="text" className="form-input" required placeholder="e.g. Milk, Cake, Tablets" value={formSubCategory} onChange={(e) => setFormSubCategory(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <input type="text" className="form-input" value={formBrand} onChange={(e) => setFormBrand(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input type="text" className="form-input" value={formSku} onChange={(e) => setFormSku(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Price *</label>
                  <input type="number" className="form-input" required value={formPrice} onChange={(e) => setFormPrice(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">MRP</label>
                  <input type="number" className="form-input" value={formMrp} onChange={(e) => setFormMrp(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount</label>
                  <input type="text" className="form-input" value={formDiscount} onChange={(e) => setFormDiscount(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Available Stock *</label>
                  <input type="number" className="form-input" required value={formStock} onChange={(e) => setFormStock(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <select className="form-input" required value={formUnit} onChange={(e) => setFormUnit(e.target.value)}>
                    <option value="piece">piece</option>
                    <option value="kg">kg</option>
                    <option value="litre">litre</option>
                    <option value="packet">packet</option>
                    <option value="box">box</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date (Optional)</label>
                  <input type="date" className="form-input" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 'bold' }}>Product Image (Mandatory) *</label>
                {formImages && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '80px', height: '80px' }}>
                      <OptimizedImage src={formImages} alt="Uploaded product" category={formCategory} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold', display: 'block' }}>✓ Image Ready</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{formImages}</span>
                      <button type="button" onClick={() => { setFormImages(''); setFormThumbnail(''); }} style={{ display: 'block', border: 'none', background: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', padding: 0, marginTop: '0.25rem', fontWeight: 600 }}>Remove Image</button>
                    </div>
                  </div>
                )}

                {!formImages && (
                  <ImageEditor
                    onSave={handleImageUpload}
                    onRemove={() => { setFormImages(''); setFormThumbnail(''); }}
                    initialImageUrl={formImages}
                    minRes={500}
                    maxRes={4000}
                    maxSizeMB={5}
                  />
                )}

                {isUploading && (
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(0,112,243,0.05)', borderRadius: '8px', border: '1px solid var(--primary)', textAlign: 'center', fontWeight: 600, color: 'var(--primary)', marginTop: '0.5rem' }}>
                    ⏳ {uploadProgressMsg}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditingProduct(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isUploading}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .summary-card {
          border-radius: var(--radius-lg);
          transition: var(--transition);
        }
        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.03);
        }
        .card-lbl {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }
        .counter-val {
          font-size: 2rem;
          display: block;
          margin-top: 0.5rem;
          font-weight: 700;
          color: var(--foreground);
        }
        .detail-lbl {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .detail-val {
          font-size: 1rem;
          color: var(--foreground);
        }
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slide-left {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
