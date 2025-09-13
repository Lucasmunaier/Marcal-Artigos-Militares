

import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';


// --- TIPOS DE DADOS ---
interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    images: string[];
    sizes: string[];
    category_ids: number[];
    is_customizable: boolean;
    custom_text_label: string | null;
    stock: number;
}

interface Category {
    id: number;
    name: string;
}

interface Kit {
    id: number;
    name: string;
    description: string;
    price: number;
    images: string[];
    products: Product[];
    category_ids: number[];
}

interface Highlight {
    id: number;
    type: 'product' | 'image';
    product_id: number | null;
    image_url: string | null;
    title: string | null;
    subtitle: string | null;
    sort_order: number;
    object_position: string;
}

interface DisplayHighlight extends Highlight {
    product?: Product;
}


type DisplayItem =
    | { type: 'product'; data: Product }
    | { type: 'kit'; data: Kit };

interface CartProductItem {
    type: 'product';
    data: Product;
    quantity: number;
    selectedSize: string;
    customText?: string;
    cartItemId: string;
}

interface CartKitItem {
    type: 'kit';
    data: Kit;
    quantity: number;
    cartItemId: string;
}

type CartItem = CartProductItem | CartKitItem;


// --- CLIENTE SUPABASE REAL ---
const SUPABASE_URL = 'https://icqaffyqnwuetfnslcif.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcWFmZnlxbnd1ZXRmbnNsY2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MTI0MzEsImV4cCI6MjA3MzE4ODQzMX0.-ob_QS2esdbrBlgYL2rnXTPsVH5fYcWIUEbext1ILuM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CONFIGURAÇÕES ---
const ADMIN_PASSWORD = 'admin'; // Senha para o painel de administração
const WHATSAPP_NUMBER = '5531993925289'; // Número do WhatsApp para receber os pedidos
const INSTAGRAM_PROFILE = 'lucasmunaier'; // Nome de usuário do seu Instagram
const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/F0EFEA/3C3C3B?text=Sem+Imagem';
const ICON_URL = 'https://icqaffyqnwuetfnslcif.supabase.co/storage/v1/object/public/site-assets/icon.png';

// --- COMPONENTES DA UI ---

const SkeletonCard = () => (
    <div className="skeleton-card">
        <div className="skeleton-image"></div>
        <div className="skeleton-text"></div>
        <div className="skeleton-text short"></div>
    </div>
);

const Header = ({ onCartClick, cartItemCount, onLogoClick, isCartAnimating, searchQuery, onSearchChange }) => (
    <header>
        <div className="logo-container" onClick={onLogoClick} style={{cursor: 'pointer'}}>
            <img src={ICON_URL} alt="Marçal Artigos Militares Logo" className="logo-icon" />
            <h1>Marçal Artigos Militares</h1>
        </div>
        <div className="search-container">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="search-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
                type="text"
                className="search-input"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Buscar produtos"
            />
            {searchQuery && (
                <button onClick={() => onSearchChange('')} className="search-clear-button" aria-label="Limpar busca">
                    &times;
                </button>
            )}
        </div>
        <button className={`cart-button ${isCartAnimating ? 'bouncing' : ''}`} onClick={onCartClick} aria-label={`Ver carrinho com ${cartItemCount} itens`}>
            <svg className="cart-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.838-5.513A1.875 1.875 0 0 0 18.25 6H5.25L4.405 3.56A1.125 1.125 0 0 0 3.322 3H2.25zM7.5 18a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
            </svg>
            {cartItemCount > 0 && <span key={cartItemCount} className="cart-count">{cartItemCount}</span>}
        </button>
    </header>
);

const Carousel = ({ items, onProductClick }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? items.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLastSlide = currentIndex === items.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };
    
    const goToSlide = (slideIndex) => {
        setCurrentIndex(slideIndex);
    };

    useEffect(() => {
        if (items.length > 1) {
            const timer = setTimeout(() => {
                goToNext();
            }, 5000); // Change slide every 5 seconds
            return () => clearTimeout(timer);
        }
    }, [currentIndex, items.length]);

    if (!items || items.length === 0) {
        return <div className="carousel-container placeholder"></div>;
    }

    const currentItem = items[currentIndex];

    const getSlideContent = (item: DisplayHighlight) => {
        let imageUrl, title, subtitle, price, isClickable = false, clickHandler = () => {};

        if (item.type === 'product' && item.product) {
            imageUrl = item.product.images?.[0] || PLACEHOLDER_IMAGE;
            title = item.product.name;
            price = item.product.price;
            isClickable = true;
            clickHandler = () => onProductClick({ type: 'product', data: item.product });
        } else if (item.type === 'image') {
            imageUrl = item.image_url;
            title = item.title;
            subtitle = item.subtitle;
        }

        return (
            <div className={`carousel-slide ${isClickable ? 'clickable' : ''}`} onClick={clickHandler}>
                <img src={imageUrl} alt={title || 'Destaque'} style={{ objectPosition: item.object_position || 'center center' }} />
                {(title || subtitle || price) && (
                    <div className="carousel-content">
                        {title && <h1>{title}</h1>}
                        {subtitle && <p>{subtitle}</p>}
                        {price && <span className="price">R$ {price.toFixed(2).replace('.', ',')}</span>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="carousel-container">
            {items.length > 1 && <button onClick={goToPrevious} className="carousel-arrow left" aria-label="Destaque anterior">&#10094;</button>}
            <div className="carousel-slide-container" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {items.map((item) => (
                    <div className="carousel-slide-wrapper" key={item.id}>
                        {getSlideContent(item)}
                    </div>
                ))}
            </div>
            {items.length > 1 && <button onClick={goToNext} className="carousel-arrow right" aria-label="Próximo destaque">&#10095;</button>}
            {items.length > 1 && (
                <div className="carousel-dots">
                    {items.map((_, slideIndex) => (
                        <div
                            key={slideIndex}
                            className={`dot ${currentIndex === slideIndex ? 'active' : ''}`}
                            onClick={() => goToSlide(slideIndex)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


const ProductCard = ({ item, onProductClick }: { item: DisplayItem, onProductClick: (item: DisplayItem) => void }) => {
    const imageUrl = (item.data.images && item.data.images.length > 0) ? item.data.images[0] : PLACEHOLDER_IMAGE;
    const isOutOfStock = item.type === 'product' && (item.data as Product).stock <= 0;

    return (
        <div className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`} onClick={() => !isOutOfStock && onProductClick(item)}>
            {isOutOfStock && <span className="item-badge stock-badge">Sem Estoque</span>}
            {item.type === 'kit' && <span className="item-badge">KIT</span>}
            <img src={imageUrl} alt={item.data.name} />
            <div className="product-card-info">
                <h3>{item.data.name}</h3>
                <p className="price">R$ {item.data.price.toFixed(2).replace('.', ',')}</p>
            </div>
        </div>
    );
};

const ProductDetailModal = ({ item, onClose, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState(item.type === 'product' ? item.data.sizes?.[0] || '' : '');
    const [customText, setCustomText] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    
    const images = useMemo(() => (item.data.images) || [], [item]);
    const [mainImage, setMainImage] = useState(images[0] || PLACEHOLDER_IMAGE);

    useEffect(() => {
        setMainImage(images[0] || PLACEHOLDER_IMAGE);
    }, [images]);

    const handleAddToCartClick = () => {
        if (item.type === 'product') {
            const product = item.data as Product;
            if (product.is_customizable && !customText.trim()) {
                alert('Por favor, insira o texto para personalização.');
                return;
            }
            if (product.sizes?.length > 0 && !selectedSize) {
                alert('Por favor, selecione um tamanho.');
                return;
            }
        }
        onAddToCart(item, quantity, selectedSize, customText);
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
        }, 1500);
    };
    
    const isOutOfStock = item.type === 'product' && (item.data as Product).stock <= 0;

    const renderProductDetails = () => {
        const product = item.data as Product;
        return (
             <div className="product-controls">
                {product.sizes && product.sizes.length > 0 && (
                    <div className="form-group">
                        <label htmlFor="size">Tamanho:</label>
                        <select id="size" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                            {product.sizes.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </div>
                )}
                {product.is_customizable && (
                    <div className="form-group">
                        <label htmlFor="customText">{product.custom_text_label || 'Personalização'}</label>
                        <input id="customText" type="text" value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="Digite o texto" required />
                    </div>
                )}
                <div className="form-group">
                    <label htmlFor="quantity">Quantidade:</label>
                    <input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))} min="1" />
                </div>
            </div>
        );
    }
    
    const renderKitDetails = () => {
        const kit = item.data as Kit;
        return (
            <div className="kit-details">
                <h4>Itens Inclusos no Kit:</h4>
                <ul className="kit-item-list">
                    {(kit.products || []).map(p => <li key={p.id}>{p.name}</li>)}
                </ul>
                 <div className="product-controls">
                    <div className="form-group">
                        <label htmlFor="quantity">Quantidade de Kits:</label>
                        <input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))} min="1" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>&times;</button>
                <div className="product-detail">
                    <div className="product-detail-images">
                        <img src={mainImage} alt={item.data.name} className="main-image" />
                        {images.length > 1 && (
                            <div className="thumbnail-gallery">
                                {images.map((img, index) => (
                                    <img 
                                        key={index}
                                        src={img}
                                        alt={`Thumbnail ${index + 1}`}
                                        className={mainImage === img ? 'active' : ''}
                                        onClick={() => setMainImage(img)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="product-detail-info">
                        <h2>{item.data.name}</h2>
                        <p className="price">R$ {item.data.price.toFixed(2).replace('.', ',')}</p>
                        {isOutOfStock && <p className="stock-message-error">Produto Esgotado</p>}
                        <p className="description">{item.data.description}</p>
                        {item.type === 'product' ? renderProductDetails() : renderKitDetails()}
                        <button 
                            className={`add-to-cart-button ${showSuccess ? 'success' : ''}`} 
                            onClick={handleAddToCartClick} 
                            disabled={showSuccess || isOutOfStock}
                        >
                            {isOutOfStock ? (
                                'Produto Esgotado'
                            ) : showSuccess ? (
                                <>Adicionado! <span className="checkmark">✓</span></>
                            ) : (
                                `Adicionar ${item.type === 'kit' ? 'Kit ' : ''}ao Carrinho`
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CartModal = ({ cart, onClose, onUpdateQuantity, onRemoveItem, onCheckout, removingItems }) => {
    const total = useMemo(() => cart.reduce((sum, item) => sum + item.data.price * item.quantity, 0), [cart]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content cart-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>&times;</button>
                <div className="cart-header">
                    <h2>Seu Carrinho</h2>
                </div>
                <div className="cart-items">
                    {cart.length === 0 ? (
                        <p className="cart-empty">Seu carrinho está vazio.</p>
                    ) : (
                        cart.map(item => {
                            const imageUrl = (item.data.images && item.data.images.length > 0) ? item.data.images[0] : PLACEHOLDER_IMAGE;
                            return (
                                <div key={item.cartItemId} className={`cart-item ${removingItems.includes(item.cartItemId) ? 'removing' : ''}`}>
                                    <img src={imageUrl} alt={item.data.name} />
                                    <div className="cart-item-info">
                                        <h4>{item.data.name} {item.type === 'kit' && '(Kit)'}</h4>
                                        {item.type === 'product' && item.selectedSize && item.data.sizes?.length > 0 && <p>Tamanho: {item.selectedSize}</p>}
                                        {item.type === 'product' && item.data.is_customizable && item.customText && <p>{item.data.custom_text_label || 'Personalização'}: "{item.customText}"</p>}
                                        <p>R$ {item.data.price.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="cart-item-actions">
                                        <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}>+</button>
                                        <button className="cart-item-remove" onClick={() => onRemoveItem(item.cartItemId)}>&times;</button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                {cart.length > 0 && (
                    <div className="cart-footer">
                        <div className="cart-total">
                            <span>Total:</span>
                            <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <button className="checkout-button" onClick={onCheckout}>Finalizar Pedido via WhatsApp</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminLogin = ({ onLogin, onBackToStore }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            onLogin();
        } else {
            setError('Senha incorreta.');
        }
    };
    
    return (
        <div className="admin-login">
            <div className="admin-header">
                <h2>Acesso Restrito</h2>
                <button onClick={onBackToStore} className="admin-button-link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                    Voltar para a Loja
                </button>
            </div>
            <form onSubmit={handleSubmit} className="admin-form">
                <div className="form-group">
                    <label htmlFor="password">Senha</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit" className="admin-button">Entrar</button>
            </form>
        </div>
    );
};

const AdminDashboard = ({ initialProducts, initialCategories, initialKits, initialHighlights, onDataChange, onBackToStore }) => {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [kits, setKits] = useState<Kit[]>(initialKits);
    const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);
    
    // Estados de Navegação
    const [activeView, setActiveView] = useState<'menu' | 'products' | 'categories' | 'kits' | 'stock' | 'highlights'>('menu');

    // Estados de Edição
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingKit, setEditingKit] = useState<Kit | null>(null);
    const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');

    // Estados de Loading
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
    const [updatingStockId, setUpdatingStockId] = useState<number | null>(null);
    
    // Drag and Drop
    const [draggedItem, setDraggedItem] = useState<{ list: string, index: number } | null>(null);

    // Formulário de produto
    const [productForm, setProductForm] = useState({ name: '', description: '', price: '', category_ids: [] as number[], sizes: '', has_sizes: false, is_customizable: false, custom_text_label: 'Nome' });
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    
    // Formulário de Kit
    const [kitForm, setKitForm] = useState({ name: '', description: '', price: '', category_ids: [] as number[] });
    const [kitImageFiles, setKitImageFiles] = useState<File[]>([]);
    const [kitImagePreviews, setKitImagePreviews] = useState<string[]>([]);
    const [kitExistingImages, setKitExistingImages] = useState<string[]>([]);
    const [selectedKitProducts, setSelectedKitProducts] = useState<Set<number>>(new Set());
    const [kitProductSearch, setKitProductSearch] = useState('');

    // Formulário de Destaque
    const [highlightForm, setHighlightForm] = useState({ type: 'product', product_id: '', title: '', subtitle: '', object_position: 'center center' });
    const [highlightImageFile, setHighlightImageFile] = useState<File | null>(null);
    const [highlightImagePreview, setHighlightImagePreview] = useState<string | null>(null);

    // Estado de Estoque
    const [stockLevels, setStockLevels] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        const initialStocks = initialProducts.reduce((acc, p) => {
            acc[p.id] = String(p.stock ?? 0);
            return acc;
        }, {});
        setStockLevels(initialStocks);
    }, [initialProducts]);


    useEffect(() => {
        if (editingProduct) {
            const safeSizes = editingProduct.sizes || [];
            const safeImages = editingProduct.images || [];
            const safeCategoryIds = editingProduct.category_ids || [];
            setProductForm({
                name: editingProduct.name,
                description: editingProduct.description,
                price: editingProduct.price.toString(),
                category_ids: safeCategoryIds,
                sizes: safeSizes.join(', '),
                has_sizes: safeSizes.length > 0,
                is_customizable: editingProduct.is_customizable,
                custom_text_label: editingProduct.custom_text_label || 'Nome',
            });
            setExistingImages(safeImages);
            setImagePreviews(safeImages);
            setImageFiles([]);
            setActiveView('products');
        } else {
            resetProductForm();
        }
    }, [editingProduct]);

    useEffect(() => {
        if (editingKit) {
            const safeImages = editingKit.images || [];
            const safeProducts = editingKit.products || [];
            const safeCategoryIds = editingKit.category_ids || [];
            setKitForm({
                name: editingKit.name,
                description: editingKit.description,
                price: editingKit.price.toString(),
                category_ids: safeCategoryIds,
            });
            setKitImagePreviews(safeImages);
            setKitExistingImages(safeImages);
            setSelectedKitProducts(new Set(safeProducts.map(p => p.id)));
            setKitImageFiles([]);
            setActiveView('kits');
        } else {
            resetKitForm();
        }
    }, [editingKit]);

    useEffect(() => {
        if (editingHighlight) {
            setHighlightForm({
                type: editingHighlight.type,
                product_id: editingHighlight.product_id?.toString() || '',
                title: editingHighlight.title || '',
                subtitle: editingHighlight.subtitle || '',
                object_position: editingHighlight.object_position || 'center center'
            });
            setHighlightImageFile(null);
            setHighlightImagePreview(editingHighlight.image_url || null);
            setActiveView('highlights');
        } else {
            resetHighlightForm();
        }
    }, [editingHighlight]);

    useEffect(() => {
        if (highlightImageFile) {
            const previewUrl = URL.createObjectURL(highlightImageFile);
            setHighlightImagePreview(previewUrl);
            return () => URL.revokeObjectURL(previewUrl);
        }
    }, [highlightImageFile]);


    useEffect(() => {
        if (products.length > 0 && activeView === 'kits') {
            const productImages = products
                .filter(p => selectedKitProducts.has(p.id))
                .map(p => p.images?.[0])
                .filter(Boolean);
    
            setKitImagePreviews(prev => {
                const currentImages = new Set(prev);
                const newImages = productImages.filter(img => !currentImages.has(img as string));
                return [...prev, ...newImages as string[]];
            });
        }
    }, [selectedKitProducts, products, activeView]);

    const resetProductForm = () => {
        setProductForm({ name: '', description: '', price: '', category_ids: [], sizes: '', has_sizes: false, is_customizable: false, custom_text_label: 'Nome' });
        imagePreviews.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
        setImageFiles([]);
        setImagePreviews([]);
        setExistingImages([]);
        setEditingProduct(null);
    };

    const resetKitForm = () => {
        setKitForm({ name: '', description: '', price: '', category_ids: [] });
        kitImagePreviews.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
        setKitImageFiles([]);
        setKitImagePreviews([]);
        setKitExistingImages([]);
        setSelectedKitProducts(new Set());
        setKitProductSearch('');
        setEditingKit(null);
    };

    const resetHighlightForm = () => {
        setHighlightForm({ type: 'product', product_id: '', title: '', subtitle: '', object_position: 'center center' });
        setHighlightImageFile(null);
        setHighlightImagePreview(null);
        setEditingHighlight(null);
        const fileInput = document.getElementById('highlightImage') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setProductForm(prev => ({ ...prev, [name]: checked }));
        } else {
            setProductForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleKitFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setKitForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCategoryChange = (categoryId: number, formType: 'product' | 'kit') => {
        const formSetter = formType === 'product' ? setProductForm : setKitForm;
    
        formSetter(prev => {
            const currentIds = new Set(prev.category_ids || []);
            if (currentIds.has(categoryId)) {
                currentIds.delete(categoryId);
            } else {
                currentIds.add(categoryId);
            }
            return { ...prev, category_ids: Array.from(currentIds) };
        });
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, isKit: boolean) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newPreviews = files.map(file => URL.createObjectURL(file));

            if (isKit) {
                setKitImageFiles(prev => [...prev, ...files]);
                setKitImagePreviews(prev => [...prev, ...newPreviews]);
            } else {
                setImageFiles(prev => [...prev, ...files]);
                setImagePreviews(prev => [...prev, ...newPreviews]);
            }
        }
    };
    
    const removeImage = (index: number, isKit: boolean) => {
        const previews = isKit ? kitImagePreviews : imagePreviews;
        const setPreviews = isKit ? setKitImagePreviews : setImagePreviews;
        const setFiles = isKit ? setKitImageFiles : setImageFiles;
        const existing = isKit ? kitExistingImages : existingImages;
        const setExisting = isKit ? setKitExistingImages : setExistingImages;

        const urlToRemove = previews[index];
        
        if (urlToRemove.startsWith('blob:')) {
            const blobPreviews = previews.filter(p => p.startsWith('blob:'));
            const fileIndex = blobPreviews.indexOf(urlToRemove);
            if (fileIndex > -1) {
                setFiles(prev => prev.filter((_, i) => i !== fileIndex));
            }
            URL.revokeObjectURL(urlToRemove);
        } else {
            setExisting(prev => prev.filter(img => img !== urlToRemove));
        }
        
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragStart = (index: number, list: string) => {
        setDraggedItem({ list, index });
    };

    // FIX: Changed the event type to HTMLElement to support both div and li elements for drag and drop.
    const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
    };

    const handleDrop = (index: number, list: string) => {
        if (!draggedItem || draggedItem.list !== list) return;

        let setter;
        if (list === 'product_images') setter = setImagePreviews;
        else if (list === 'kit_images') setter = setKitImagePreviews;
        else if (list === 'highlights') setter = setHighlights;
        else return;
        
        setter(currentItems => {
            const newItems = [...currentItems];
            const [dragged] = newItems.splice(draggedItem.index, 1);
            newItems.splice(index, 0, dragged);
            
            if (list === 'highlights') {
                handleSaveHighlightOrder(newItems);
            }

            return newItems;
        });
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    const handleKitProductToggle = (productId: number) => {
        setSelectedKitProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };
    
    const handleAddCategory = async (e) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('categoryName') as HTMLInputElement).value;
        if (name && !categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
            setIsSubmitting(true);
            const { data: addedCategory, error } = await supabase.from('categories').insert({ name }).select().single();
            if (error) {
                alert('Erro ao adicionar categoria: ' + error.message);
            } else {
                const newCategories = [...categories, addedCategory];
                setCategories(newCategories);
                onDataChange(products, newCategories, kits, highlights);
                form.reset();
            }
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteCategory = async (categoryId: number) => {
        const isCategoryInUseByProduct = products.some(p => (p.category_ids || []).includes(categoryId));
        const isCategoryInUseByKit = kits.some(k => (k.category_ids || []).includes(categoryId));
        if (isCategoryInUseByProduct || isCategoryInUseByKit) {
            alert('Não é possível excluir esta categoria, pois ela está sendo usada por um ou mais produtos ou kits.');
            return;
        }
        if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
            setDeletingItemId(`cat-${categoryId}`);
            const { error } = await supabase.from('categories').delete().eq('id', categoryId);
            if (error) {
                alert('Erro ao excluir categoria: ' + error.message);
            } else {
                const newCategories = categories.filter(c => c.id !== categoryId);
                setCategories(newCategories);
                onDataChange(products, newCategories, kits, highlights);
            }
            setDeletingItemId(null);
        }
    };

    const handleStartEditCategory = (category: Category) => {
        setEditingCategory(category);
        setEditingCategoryName(category.name);
    };

    const handleUpdateCategory = async (e) => {
        e.preventDefault();
        if (!editingCategory || !editingCategoryName.trim()) return;

        setIsSubmitting(true);
        const { data: updatedCategory, error } = await supabase
            .from('categories')
            .update({ name: editingCategoryName })
            .eq('id', editingCategory.id)
            .select()
            .single();

        if (error) {
            alert('Erro ao atualizar categoria: ' + error.message);
        } else {
            const newCategories = categories.map(c => c.id === updatedCategory.id ? updatedCategory : c);
            setCategories(newCategories);
            onDataChange(products, newCategories, kits, highlights);
            setEditingCategory(null);
        }
        setIsSubmitting(false);
    };

    const handleProductFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const uploadedImageUrls: string[] = [];
        for (const file of imageFiles) {
            const filePath = `public/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
            if (uploadError) {
                alert('Erro ao fazer upload da imagem: ' + uploadError.message);
                setIsSubmitting(false); return;
            }
            const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
            uploadedImageUrls.push(data.publicUrl);
        }

        if (editingProduct) {
            const imagesToRemove = (editingProduct.images || []).filter(img => !existingImages.includes(img));
            if (imagesToRemove.length > 0) {
                const imagePaths = imagesToRemove.map(url => new URL(url).pathname.split('/product-images/')[1]);
                await supabase.storage.from('product-images').remove(imagePaths);
            }
        }
        
        const blobPreviews = imagePreviews.filter(url => url.startsWith('blob:'));
        const finalImageUrls = imagePreviews.map(url => {
            if (url.startsWith('blob:')) {
                const index = blobPreviews.indexOf(url);
                return uploadedImageUrls[index];
            }
            return url;
        });

        const productData = {
            name: productForm.name,
            description: productForm.description,
            price: parseFloat(productForm.price),
            images: finalImageUrls,
            sizes: productForm.has_sizes ? productForm.sizes.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [],
            is_customizable: productForm.is_customizable,
            custom_text_label: productForm.is_customizable ? productForm.custom_text_label : null,
            category_ids: productForm.category_ids || [],
        };

        let savedProduct;
        if (editingProduct) {
            const { data, error } = await supabase.from('products').update(productData).eq('id', editingProduct.id).select().single();
            if (error) { alert('Erro ao atualizar produto: ' + error.message); setIsSubmitting(false); return; }
            savedProduct = data;
        } else {
            const { data, error } = await supabase.from('products').insert(productData).select().single();
            if (error) { alert('Erro ao adicionar produto: ' + error.message); setIsSubmitting(false); return; }
            savedProduct = data;
        }

        const finalProduct = { ...savedProduct, category_ids: savedProduct.category_ids || [], stock: savedProduct.stock ?? 0 };

        let newProducts;
        if (editingProduct) {
            newProducts = products.map(p => p.id === finalProduct.id ? finalProduct : p);
        } else {
            newProducts = [...products, finalProduct];
        }
        setProducts(newProducts);
        onDataChange(newProducts, categories, kits, highlights);
        resetProductForm();
        setIsSubmitting(false);
    };

    const handleDeleteProduct = async (productId: number) => {
        const productToDelete = products.find(p => p.id === productId);
        if (!productToDelete) return;

        const kitsContainingProduct = kits.filter(kit =>
            (kit.products || []).some(p => p.id === productId)
        );
        const isProductInKit = kitsContainingProduct.length > 0;

        if (isProductInKit) {
            const kitNames = kitsContainingProduct.map(k => k.name).join(', ');
            const confirmMessage = `Este produto está nos seguintes kits: ${kitNames}.\n\nDeseja removê-lo desses kits e excluir o produto permanentemente?`;

            if (!window.confirm(confirmMessage)) {
                return; // User cancelled the operation
            }

            // User confirmed, so first remove product from all kits
            const { error: assocError } = await supabase
                .from('kit_products')
                .delete()
                .eq('product_id', productId);

            if (assocError) {
                alert('Erro ao remover o produto dos kits: ' + assocError.message);
                setDeletingItemId(null);
                return;
            }
        } else {
            // Standard confirmation for products not in any kit
            if (!window.confirm('Tem certeza que deseja excluir este produto?')) {
                return;
            }
        }

        // Proceed with deletion
        setDeletingItemId(`prod-${productId}`);
        try {
            // Delete images from storage
            if (productToDelete.images?.length > 0) {
                const imagePaths = productToDelete.images.map(url => {
                    try {
                        return new URL(url).pathname.split('/product-images/')[1];
                    } catch (e) {
                        console.warn('URL de imagem inválida, pulando exclusão:', url);
                        return null;
                    }
                }).filter(Boolean) as string[];

                if (imagePaths.length > 0) {
                     await supabase.storage.from('product-images').remove(imagePaths);
                }
            }

            // Delete product from database
            const { error: deleteError } = await supabase.from('products').delete().eq('id', productId);

            if (deleteError) {
                alert(`Erro ao excluir produto: ${deleteError.message}\n\nIsso pode acontecer se o produto ainda estiver vinculado a outras partes do sistema.`);
            } else {
                const newProducts = products.filter(p => p.id !== productId);
                
                let updatedKits = kits;
                if (isProductInKit) {
                    updatedKits = kits.map(kit => ({
                        ...kit,
                        products: (kit.products || []).filter(p => p.id !== productId),
                    }));
                }
                
                setProducts(newProducts);
                setKits(updatedKits);
                onDataChange(newProducts, categories, updatedKits, highlights);
            }
        } catch (e: any) {
            alert('Ocorreu um erro inesperado: ' + e.message);
        } finally {
            setDeletingItemId(null);
        }
    };

    const handleKitFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const uploadedImageUrls: string[] = [];
        for (const file of kitImageFiles) {
            const filePath = `public/kit-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
            if (uploadError) {
                alert('Erro ao fazer upload da imagem do kit: ' + uploadError.message);
                setIsSubmitting(false); return;
            }
            const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
            uploadedImageUrls.push(data.publicUrl);
        }

        if (editingKit) {
            const imagesToRemove = (editingKit.images || []).filter(img => !kitExistingImages.includes(img));
            if (imagesToRemove.length > 0) {
                const imagePaths = imagesToRemove.map(url => new URL(url).pathname.split('/product-images/')[1]);
                await supabase.storage.from('product-images').remove(imagePaths);
            }
        }

        const blobPreviews = kitImagePreviews.filter(url => url.startsWith('blob:'));
        const finalImageUrls = kitImagePreviews.map(url => {
            if (url.startsWith('blob:')) {
                const index = blobPreviews.indexOf(url);
                return uploadedImageUrls[index];
            }
            return url;
        });

        const descriptionPayload = JSON.stringify({
            text: kitForm.description,
            images: finalImageUrls,
            categoryIds: kitForm.category_ids || [],
        });

        const kitData = {
            name: kitForm.name,
            description: descriptionPayload,
            price: parseFloat(kitForm.price),
        };

        const productAssociations = Array.from(selectedKitProducts);

        if (editingKit) {
            const { data: updatedKit, error } = await supabase.from('kits').update(kitData).eq('id', editingKit.id).select().single();
            if (error) { alert('Erro ao atualizar kit: ' + error.message); }
            else {
                await supabase.from('kit_products').delete().eq('kit_id', updatedKit.id);
                const kitProductInserts = productAssociations.map(pid => ({ kit_id: updatedKit.id, product_id: pid }));
                await supabase.from('kit_products').insert(kitProductInserts);

                const updatedKitWithProducts: Kit = { 
                    ...updatedKit, 
                    description: kitForm.description, 
                    images: finalImageUrls, 
                    products: products.filter(p => productAssociations.includes(p.id)),
                    category_ids: kitForm.category_ids || [],
                };
                const newKits = kits.map(k => k.id === updatedKit.id ? updatedKitWithProducts : k);
                setKits(newKits);
                onDataChange(products, categories, newKits, highlights);
                resetKitForm();
            }
        } else {
            const { data: addedKit, error } = await supabase.from('kits').insert(kitData).select().single();
            if (error) { alert('Erro ao adicionar kit: ' + error.message); }
            else {
                const kitProductInserts = productAssociations.map(pid => ({ kit_id: addedKit.id, product_id: pid }));
                await supabase.from('kit_products').insert(kitProductInserts);

                const addedKitWithProducts: Kit = { 
                    ...addedKit, 
                    description: kitForm.description,
                    images: finalImageUrls,
                    products: products.filter(p => productAssociations.includes(p.id)),
                    category_ids: kitForm.category_ids || [],
                };
                const newKits = [...kits, addedKitWithProducts];
                setKits(newKits);
                onDataChange(products, categories, newKits, highlights);
                resetKitForm();
            }
        }
        setIsSubmitting(false);
    };

    const handleDeleteKit = async (kitId: number) => {
        const kitToDelete = kits.find(k => k.id === kitId);
        if (!kitToDelete) return;

        if (window.confirm('Tem certeza que deseja excluir este kit?')) {
            setDeletingItemId(`kit-${kitId}`);

            const { error: assocError } = await supabase.from('kit_products').delete().eq('kit_id', kitId);
            if (assocError) {
                alert('Erro ao remover as associações do kit: ' + assocError.message);
                setDeletingItemId(null);
                return;
            }

            if (kitToDelete.images && kitToDelete.images.length > 0) {
                const imagePaths = kitToDelete.images.map(url => new URL(url).pathname.split('/product-images/')[1]);
                await supabase.storage.from('product-images').remove(imagePaths);
            }

            const { error } = await supabase.from('kits').delete().eq('id', kitId);
            if (error) { alert('Erro ao excluir kit: ' + error.message); }
            else {
                const newKits = kits.filter(k => k.id !== kitId);
                setKits(newKits);
                onDataChange(products, categories, newKits, highlights);
            }
            setDeletingItemId(null);
        }
    };
    
    const handleStockChange = (productId: number, value: string) => {
        if (/^\d*$/.test(value)) {
            setStockLevels(prev => ({ ...prev, [productId]: value }));
        }
    };

    const handleUpdateStock = async (productId: number) => {
        const newStockString = stockLevels[productId];
        if (newStockString === null || newStockString === undefined || newStockString.trim() === '') {
            alert('O campo de estoque não pode estar vazio.');
            return;
        }
        const newStock = parseInt(newStockString, 10);

        if (isNaN(newStock) || newStock < 0) {
            alert('Por favor, insira um valor de estoque válido (número inteiro maior ou igual a 0).');
            return;
        }

        setUpdatingStockId(productId);
        const { data: updatedProduct, error } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', productId)
            .select()
            .single();
        setUpdatingStockId(null);

        if (error) {
            alert('Erro ao atualizar o estoque: ' + error.message);
        } else {
            const newProducts = products.map(p => p.id === productId ? updatedProduct : p);
            setProducts(newProducts);
            onDataChange(newProducts, categories, kits, highlights);
        }
    };
    
    const handleHighlightFormChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            setHighlightImageFile(files[0]);
        } else {
            setHighlightForm(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleHighlightSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const highlightData: Partial<Highlight> = {
            type: highlightForm.type as 'product' | 'image',
            title: highlightForm.title,
            subtitle: highlightForm.subtitle,
            object_position: highlightForm.object_position
        };

        if (highlightForm.type === 'product') {
            if (!highlightForm.product_id) {
                alert('Por favor, selecione um produto.');
                setIsSubmitting(false); return;
            }
            highlightData.product_id = parseInt(highlightForm.product_id, 10);
            highlightData.image_url = null;
        } else { // type is 'image'
            highlightData.product_id = null;
            if (highlightImageFile) { // If a new file is uploaded
                const file = highlightImageFile;
                const filePath = `highlights/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
                if (uploadError) {
                    alert('Erro no upload: ' + uploadError.message);
                    setIsSubmitting(false); return;
                }
                const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
                highlightData.image_url = data.publicUrl;
            } else if (!editingHighlight || !editingHighlight.image_url) {
                alert('Por favor, selecione uma imagem.');
                setIsSubmitting(false); return;
            }
        }

        let savedHighlight;
        if (editingHighlight) {
            const { data, error } = await supabase.from('highlights').update(highlightData).eq('id', editingHighlight.id).select().single();
            if (error) { alert('Erro ao atualizar: ' + error.message); setIsSubmitting(false); return; }
            savedHighlight = data;
        } else {
            highlightData.sort_order = highlights.length;
            const { data, error } = await supabase.from('highlights').insert(highlightData).select().single();
            if (error) { alert('Erro ao adicionar: ' + error.message); setIsSubmitting(false); return; }
            savedHighlight = data;
        }

        const newHighlights = editingHighlight
            ? highlights.map(h => h.id === savedHighlight.id ? savedHighlight : h)
            : [...highlights, savedHighlight];
            
        setHighlights(newHighlights);
        onDataChange(products, categories, kits, newHighlights);
        resetHighlightForm();
        setIsSubmitting(false);
    };

    const handleDeleteHighlight = async (highlightId: number) => {
        if (!window.confirm('Tem certeza que deseja remover este destaque?')) return;
        
        setDeletingItemId(`hl-${highlightId}`);
        const highlightToDelete = highlights.find(h => h.id === highlightId);

        // Delete image from storage if it's a custom image highlight
        if (highlightToDelete?.type === 'image' && highlightToDelete.image_url) {
            try {
                const imagePath = new URL(highlightToDelete.image_url).pathname.split('/product-images/')[1];
                await supabase.storage.from('product-images').remove([imagePath]);
            } catch (e) {
                console.warn("Não foi possível remover a imagem do destaque do armazenamento:", e);
            }
        }
        
        const { error } = await supabase.from('highlights').delete().eq('id', highlightId);
        
        if (error) {
            alert('Erro ao remover destaque: ' + error.message);
        } else {
            const newHighlights = highlights.filter(h => h.id !== highlightId);
            setHighlights(newHighlights);
            onDataChange(products, categories, kits, newHighlights);
        }
        setDeletingItemId(null);
    };

    const handleSaveHighlightOrder = async (orderedHighlights: Highlight[]) => {
        const updates = orderedHighlights.map((highlight, index) =>
            supabase
                .from('highlights')
                .update({ sort_order: index })
                .eq('id', highlight.id)
        );
        
        const results = await Promise.all(updates);
        const hasError = results.some(res => res.error);
        
        if (hasError) {
            alert('Ocorreu um erro ao salvar a nova ordem dos destaques.');
            // Optionally, revert local state to `initialHighlights` to stay in sync with DB
        } else {
             onDataChange(products, categories, kits, orderedHighlights);
        }
    };


    const categoriesWithoutAll = categories.filter(c => c.id !== 1);

    const renderMenu = () => (
        <div className="admin-menu">
            <button className="admin-button" onClick={() => setActiveView('products')}>Gerenciar Produtos</button>
            <button className="admin-button" onClick={() => setActiveView('categories')}>Gerenciar Categorias</button>
            <button className="admin-button" onClick={() => setActiveView('kits')}>Gerenciar Kits</button>
            <button className="admin-button" onClick={() => setActiveView('stock')}>Gerenciar Estoque</button>
            <button className="admin-button" onClick={() => setActiveView('highlights')}>Gerenciar Destaques</button>
        </div>
    );
    
    const renderProductsView = () => (
         <div className="admin-view">
            <button onClick={() => setActiveView('menu')} className="admin-back-button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Voltar ao Menu
            </button>
            <div className="admin-content-grid">
                <section className="admin-section">
                     <h3>{editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}</h3>
                    <form onSubmit={handleProductFormSubmit} className="admin-form">
                        <div className="form-group"><label htmlFor="productName">Nome</label><input type="text" id="productName" name="name" value={productForm.name} onChange={handleFormChange} required /></div>
                        <div className="form-group"><label htmlFor="productDescription">Descrição</label><textarea id="productDescription" name="description" value={productForm.description} onChange={handleFormChange}></textarea></div>
                        <div className="form-group"><label htmlFor="productPrice">Preço (ex: 99.90)</label><input type="number" id="productPrice" name="price" value={productForm.price} onChange={handleFormChange} step="0.01" required /></div>
                        
                        <div className="form-group">
                            <label htmlFor="productImages">Imagens do Produto</label>
                            <input type="file" id="productImages" multiple accept="image/*" onChange={(e) => handleImageSelect(e, false)} />
                        </div>
                        <div className="image-previews">
                            {imagePreviews.map((src, index) => (
                                <div 
                                    key={src + index} 
                                    className={`image-preview-item ${draggedItem?.list === 'product_images' && draggedItem.index === index ? 'dragging' : ''}`}
                                    draggable
                                    onDragStart={() => handleDragStart(index, 'product_images')}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(index, 'product_images')}
                                    onDragEnd={handleDragEnd}
                                >
                                    <span className="image-order-badge">{index + 1}</span>
                                    <img src={src} alt={`Preview ${index + 1}`} />
                                    <button type="button" onClick={() => removeImage(index, false)} aria-label="Remover imagem">&times;</button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="form-group-checkbox">
                           <input type="checkbox" id="has_sizes" name="has_sizes" checked={productForm.has_sizes} onChange={handleFormChange} />
                           <label htmlFor="has_sizes">Habilitar seleção de tamanhos</label>
                        </div>
                        {productForm.has_sizes && (
                            <div className="form-group">
                                <label htmlFor="productSizes">Tamanhos (separados por vírgula)</label>
                                <input type="text" id="productSizes" name="sizes" value={productForm.sizes} onChange={handleFormChange} placeholder="P, M, G" required={productForm.has_sizes} />
                            </div>
                        )}

                        <div className="form-group-checkbox">
                           <input type="checkbox" id="is_customizable" name="is_customizable" checked={productForm.is_customizable} onChange={handleFormChange} />
                           <label htmlFor="is_customizable">Habilitar campo de texto personalizado</label>
                        </div>
                        {productForm.is_customizable && (
                            <div className="form-group">
                                <label htmlFor="custom_text_label">Rótulo do campo (ex: Nome, Tarjeta)</label>
                                <input type="text" id="custom_text_label" name="custom_text_label" value={productForm.custom_text_label} onChange={handleFormChange} required={productForm.is_customizable} />
                            </div>
                        )}
                        
                        <div className="form-group">
                            <label>Categorias</label>
                            <div className="category-checklist-container">
                                {categoriesWithoutAll.map(cat => (
                                    <div key={cat.id} className="category-checklist-item">
                                        <input
                                            type="checkbox"
                                            id={`product-cat-${cat.id}`}
                                            checked={(productForm.category_ids || []).includes(cat.id)}
                                            onChange={() => handleCategoryChange(cat.id, 'product')}
                                        />
                                        <label htmlFor={`product-cat-${cat.id}`}>{cat.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="admin-form-actions">
                            <button type="submit" className="admin-button" disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : (editingProduct ? 'Salvar Alterações' : 'Adicionar Produto')}
                            </button>
                            {editingProduct && (
                                <button type="button" className="admin-button cancel" onClick={resetProductForm}>Cancelar</button>
                            )}
                        </div>
                    </form>
                </section>
                 <section className="admin-section">
                        <h3>Produtos Existentes</h3>
                        {products.length === 0 ? (
                            <p className="empty-list-message">Nenhum produto cadastrado.</p>
                        ) : (
                            <ul className="item-list product-list">
                                {products.map(product => {
                                    const imageUrl = (product.images && product.images.length > 0) ? product.images[0] : PLACEHOLDER_IMAGE;
                                    return (
                                        <li key={product.id}>
                                            <img src={imageUrl} alt={product.name} className="item-list-img" />
                                            <div className="item-list-details">
                                                <span className="item-list-name">{product.name}</span>
                                                <span className="item-list-price">R$ {product.price.toFixed(2).replace('.',',')}</span>
                                                <div className="item-list-actions">
                                                    <button onClick={() => setEditingProduct(product)} className="item-list-edit-button">Editar</button>
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="item-list-delete-button" disabled={deletingItemId === `prod-${product.id}`} aria-label={`Excluir produto ${product.name}`}>
                                                        {deletingItemId === `prod-${product.id}` ? '...' : 'Excluir'}
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
            </div>
        </div>
    );
    
    const renderCategoriesView = () => (
        <div className="admin-view">
            <button onClick={() => setActiveView('menu')} className="admin-back-button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Voltar ao Menu
            </button>
            <div className="admin-content-grid">
                <section className="admin-section">
                    <h3>Adicionar Categoria</h3>
                    <form onSubmit={handleAddCategory} className="admin-form">
                        <div className="form-group">
                            <label htmlFor="categoryName">Nome da Categoria</label>
                            <input type="text" id="categoryName" name="categoryName" required />
                        </div>
                        <button type="submit" className="admin-button" disabled={isSubmitting}>
                            {isSubmitting ? 'Adicionando...' : 'Adicionar Categoria'}
                        </button>
                    </form>
                </section>
                <section className="admin-section">
                    <h3>Categorias Existentes</h3>
                    {categoriesWithoutAll.length === 0 ? (
                        <p className="empty-list-message">Nenhuma categoria cadastrada.</p>
                    ) : (
                        <ul className="item-list">
                            {categoriesWithoutAll.map(cat => (
                                <li key={cat.id}>
                                    {editingCategory?.id === cat.id ? (
                                        <form onSubmit={handleUpdateCategory} className="category-edit-form">
                                            <input type="text" value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} autoFocus />
                                            <button type="submit" disabled={isSubmitting}>Salvar</button>
                                            <button type="button" onClick={() => setEditingCategory(null)}>Cancelar</button>
                                        </form>
                                    ) : (
                                        <>
                                            <span className="item-list-name">{cat.name}</span>
                                            <div className="item-list-actions">
                                                <button onClick={() => handleStartEditCategory(cat)} className="item-list-edit-button">Editar</button>
                                                <button onClick={() => handleDeleteCategory(cat.id)} className="item-list-delete-button" disabled={deletingItemId === `cat-${cat.id}`} aria-label={`Excluir categoria ${cat.name}`}>
                                                    {deletingItemId === `cat-${cat.id}` ? '...' : 'Excluir'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );

    const renderKitsView = () => {
        const filteredKitProducts = products.filter(p => p.name.toLowerCase().includes(kitProductSearch.toLowerCase()));

        return (
        <div className="admin-view">
            <button onClick={() => setActiveView('menu')} className="admin-back-button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Voltar ao Menu
            </button>
            <div className="admin-content-grid">
                 <section className="admin-section">
                    <h3>{editingKit ? 'Editar Kit' : 'Criar Novo Kit'}</h3>
                    <form onSubmit={handleKitFormSubmit} className="admin-form">
                        <div className="form-group"><label htmlFor="kitName">Nome do Kit</label><input type="text" id="kitName" name="name" value={kitForm.name} onChange={handleKitFormChange} required /></div>
                        <div className="form-group"><label htmlFor="kitDescription">Descrição</label><textarea id="kitDescription" name="description" value={kitForm.description} onChange={handleKitFormChange}></textarea></div>
                        <div className="form-group"><label htmlFor="kitPrice">Preço do Kit</label><input type="number" id="kitPrice" name="price" value={kitForm.price} onChange={handleKitFormChange} step="0.01" required /></div>
                        
                        <div className="form-group">
                            <label>Categorias</label>
                            <div className="category-checklist-container">
                                {categoriesWithoutAll.map(cat => (
                                    <div key={cat.id} className="category-checklist-item">
                                        <input
                                            type="checkbox"
                                            id={`kit-cat-${cat.id}`}
                                            checked={(kitForm.category_ids || []).includes(cat.id)}
                                            onChange={() => handleCategoryChange(cat.id, 'kit')}
                                        />
                                        <label htmlFor={`kit-cat-${cat.id}`}>{cat.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="kitImage">Imagens do Kit (a primeira será a principal)</label>
                            <input type="file" id="kitImage" multiple accept="image/*" onChange={(e) => handleImageSelect(e, true)} />
                        </div>
                        <div className="image-previews">
                           {kitImagePreviews.map((src, index) => (
                                <div
                                    key={src + index}
                                    className={`image-preview-item ${draggedItem?.list === 'kit_images' && draggedItem.index === index ? 'dragging' : ''}`}
                                    draggable
                                    onDragStart={() => handleDragStart(index, 'kit_images')}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(index, 'kit_images')}
                                    onDragEnd={handleDragEnd}
                                >
                                    <span className="image-order-badge">{index + 1}</span>
                                    <img src={src} alt={`Preview ${index + 1}`} />
                                    <button type="button" onClick={() => removeImage(index, true)} aria-label="Remover imagem">&times;</button>
                                </div>
                            ))}
                        </div>

                        <div className="form-group">
                            <label>Produtos para incluir no Kit</label>
                            <input
                                type="text"
                                placeholder="Buscar produtos..."
                                className="product-search-input"
                                value={kitProductSearch}
                                onChange={(e) => setKitProductSearch(e.target.value)}
                            />
                            <div className="product-selection-grid">
                                {filteredKitProducts.length > 0 ? filteredKitProducts.map(p => {
                                    const imageUrl = (p.images && p.images.length > 0) ? p.images[0] : PLACEHOLDER_IMAGE;
                                    return (
                                        <div 
                                            key={p.id} 
                                            className={`product-selection-item ${selectedKitProducts.has(p.id) ? 'selected' : ''}`}
                                            onClick={() => handleKitProductToggle(p.id)}
                                        >
                                            <img src={imageUrl} alt={p.name} />
                                            <span>{p.name}</span>
                                        </div>
                                    )
                                }) : <p className="empty-list-message">Nenhum produto encontrado.</p>}
                            </div>
                            <small>As imagens dos produtos selecionados serão adicionadas automaticamente ao kit.</small>
                        </div>

                        <div className="admin-form-actions">
                            <button type="submit" className="admin-button" disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : (editingKit ? 'Salvar Kit' : 'Criar Kit')}
                            </button>
                            {editingKit && (
                                <button type="button" className="admin-button cancel" onClick={resetKitForm}>Cancelar</button>
                            )}
                        </div>
                    </form>
                </section>
                 <section className="admin-section">
                    <h3>Kits Existentes</h3>
                    {kits.length === 0 ? (
                        <p className="empty-list-message">Nenhum kit cadastrado.</p>
                    ) : (
                         <ul className="item-list product-list">
                            {kits.map(kit => {
                                const imageUrl = (kit.images && kit.images.length > 0) ? kit.images[0] : PLACEHOLDER_IMAGE;
                                return (
                                    <li key={kit.id}>
                                        <img src={imageUrl} alt={kit.name} className="item-list-img" />
                                        <div className="item-list-details">
                                            <span className="item-list-name">{kit.name}</span>
                                            <span className="item-list-price">R$ {kit.price.toFixed(2).replace('.',',')}</span>
                                            <div className="item-list-actions">
                                                <button onClick={() => setEditingKit(kit)} className="item-list-edit-button">Editar</button>
                                                <button onClick={() => handleDeleteKit(kit.id)} className="item-list-delete-button" disabled={deletingItemId === `kit-${kit.id}`} aria-label={`Excluir kit ${kit.name}`}>
                                                    {deletingItemId === `kit-${kit.id}` ? '...' : 'Excluir'}
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
        );
    };

    const renderStockView = () => (
        <div className="admin-view">
            <button onClick={() => setActiveView('menu')} className="admin-back-button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Voltar ao Menu
            </button>
            <section className="admin-section">
                <h3>Gerenciar Estoque</h3>
                <p>Atualize a quantidade de cada produto em seu inventário.</p>
                {products.length === 0 ? (
                    <p className="empty-list-message">Nenhum produto cadastrado para gerenciar o estoque.</p>
                ) : (
                    <ul className="item-list stock-list">
                        {products.map(product => {
                             const imageUrl = (product.images && product.images.length > 0) ? product.images[0] : PLACEHOLDER_IMAGE;
                            return (
                                <li key={product.id}>
                                    <img src={imageUrl} alt={product.name} className="item-list-img" />
                                    <div className="item-list-details">
                                        <span className="item-list-name">{product.name}</span>
                                        <div className="stock-controls">
                                            <label htmlFor={`stock-${product.id}`}>Estoque:</label>
                                            <input
                                                id={`stock-${product.id}`}
                                                type="number"
                                                min="0"
                                                value={stockLevels[product.id] || '0'}
                                                onChange={(e) => handleStockChange(product.id, e.target.value)}
                                                className="stock-input"
                                            />
                                            <button onClick={() => handleUpdateStock(product.id)} className="stock-update-button" disabled={updatingStockId === product.id}>
                                                {updatingStockId === product.id ? '...' : 'Salvar'}
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
    
    const renderHighlightsView = () => {
        const getHighlightDisplayInfo = (highlight: Highlight) => {
            if (highlight.type === 'product' && highlight.product_id) {
                const product = products.find(p => p.id === highlight.product_id);
                return {
                    image: product?.images?.[0] || PLACEHOLDER_IMAGE,
                    title: product?.name || 'Produto não encontrado',
                    subtitle: `Produto - R$ ${product?.price.toFixed(2).replace('.',',') || 'N/A'}`
                };
            } else {
                 return {
                    image: highlight.image_url || PLACEHOLDER_IMAGE,
                    title: highlight.title || 'Imagem Personalizada',
                    subtitle: highlight.subtitle || ''
                };
            }
        };

        const focalPointPositions = [
            'top left', 'top center', 'top right',
            'center left', 'center center', 'center right',
            'bottom left', 'bottom center', 'bottom right'
        ];

        return (
            <div className="admin-view">
                <button onClick={() => setActiveView('menu')} className="admin-back-button">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                    Voltar ao Menu
                </button>
                <div className="admin-content-grid">
                    <section className="admin-section">
                        <h3>{editingHighlight ? 'Editar Destaque' : 'Adicionar Novo Destaque'}</h3>
                        <form onSubmit={handleHighlightSubmit} className="admin-form">
                            <div className="form-group">
                                <label>Tipo de Destaque</label>
                                <select name="type" value={highlightForm.type} onChange={handleHighlightFormChange} style={{marginBottom: '1rem'}}>
                                    <option value="product">Produto Existente</option>
                                    <option value="image">Imagem Personalizada</option>
                                </select>
                            </div>

                            {highlightForm.type === 'product' ? (
                                <div className="form-group">
                                    <label htmlFor="product_id">Selecione o Produto</label>
                                    <select id="product_id" name="product_id" value={highlightForm.product_id} onChange={handleHighlightFormChange} required>
                                        <option value="">-- Escolha um produto --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label htmlFor="highlightImage">Imagem</label>
                                        <input type="file" id="highlightImage" name="image" accept="image/*" onChange={handleHighlightFormChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="title">Título (opcional)</label>
                                        <input type="text" id="title" name="title" value={highlightForm.title} onChange={handleHighlightFormChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="subtitle">Subtítulo (opcional)</label>
                                        <input type="text" id="subtitle" name="subtitle" value={highlightForm.subtitle} onChange={handleHighlightFormChange} />
                                    </div>
                                    {highlightImagePreview && (
                                        <div className="highlight-preview-container">
                                            <h4>Pré-visualização do Enquadramento</h4>
                                            <img 
                                                src={highlightImagePreview} 
                                                className="highlight-preview-image"
                                                style={{ objectPosition: highlightForm.object_position }}
                                                alt="Pré-visualização do destaque"
                                            />
                                            <div className="focal-point-selector">
                                                <label>Ponto Focal (clique para ajustar)</label>
                                                <div className="focal-point-grid">
                                                    {focalPointPositions.map(pos => (
                                                        <button 
                                                            type="button" 
                                                            key={pos} 
                                                            className={`focal-point-button ${highlightForm.object_position === pos ? 'active' : ''}`}
                                                            onClick={() => setHighlightForm(prev => ({ ...prev, object_position: pos }))}
                                                            aria-label={`Definir ponto focal para ${pos}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="admin-form-actions">
                                <button type="submit" className="admin-button" disabled={isSubmitting}>
                                    {isSubmitting ? 'Salvando...' : (editingHighlight ? 'Salvar Alterações' : 'Adicionar Destaque')}
                                </button>
                                {editingHighlight && (
                                    <button type="button" className="admin-button cancel" onClick={resetHighlightForm}>Cancelar</button>
                                )}
                            </div>
                        </form>
                    </section>
                    <section className="admin-section">
                        <h3>Destaques Atuais</h3>
                        <p>Arraste para reordenar.</p>
                        {highlights.length === 0 ? (
                            <p className="empty-list-message">Nenhum destaque cadastrado.</p>
                        ) : (
                            <ul className="item-list highlights-admin-list">
                                {highlights.map((highlight, index) => {
                                    const { image, title, subtitle } = getHighlightDisplayInfo(highlight);
                                    return (
                                        <li 
                                            key={highlight.id}
                                            draggable
                                            className={draggedItem?.list === 'highlights' && draggedItem.index === index ? 'dragging' : ''}
                                            onDragStart={() => handleDragStart(index, 'highlights')}
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop(index, 'highlights')}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <span className="drag-handle">::</span>
                                            <img src={image} alt={title} className="item-list-img" />
                                            <div className="item-list-details">
                                                <span className="item-list-name">{title}</span>
                                                <small>{subtitle}</small>
                                            </div>
                                            <div className="item-list-actions">
                                                 <button onClick={() => setEditingHighlight(highlight)} className="item-list-edit-button">Editar</button>
                                                <button onClick={() => handleDeleteHighlight(highlight.id)} className="item-list-delete-button" disabled={deletingItemId === `hl-${highlight.id}`}>
                                                    {deletingItemId === `hl-${highlight.id}` ? '...' : 'Excluir'}
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        )
    };

    return (
        <div className="admin-container">
            <div className="admin-header">
                 <h2>Painel do Administrador</h2>
                 <button onClick={onBackToStore} className="admin-button-link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                    Voltar para a Loja
                 </button>
            </div>
            
            {activeView === 'menu' && renderMenu()}
            {activeView === 'products' && renderProductsView()}
            {activeView === 'categories' && renderCategoriesView()}
            {activeView === 'kits' && renderKitsView()}
            {activeView === 'stock' && renderStockView()}
            {activeView === 'highlights' && renderHighlightsView()}
        </div>
    );
};

const Footer = ({ onAdminClick }) => (
    <footer className="site-footer">
        <div className="footer-content">
            <div className="footer-contact">
                <p>Contato: {WHATSAPP_NUMBER}</p>
                <p>
                    <a href={`https://instagram.com/${INSTAGRAM_PROFILE}`} target="_blank" rel="noopener noreferrer">Instagram</a> | 
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </p>
            </div>
            <div className="footer-admin">
                 <button onClick={onAdminClick} className="footer-admin-link">Painel de Gestão</button>
            </div>
        </div>
    </footer>
);


// --- COMPONENTE PRINCIPAL DA APLICAÇÃO ---
const App = () => {
    // Estado da Aplicação
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [kits, setKits] = useState<Kit[]>([]);
    const [highlights, setHighlights] = useState<DisplayHighlight[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number>(1); // 1 = 'Todos'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDisplayItem, setSelectedDisplayItem] = useState<DisplayItem | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState('store'); // 'store', 'adminLogin', 'adminDashboard'
    const [isCartAnimating, setIsCartAnimating] = useState(false);
    const [removingItems, setRemovingItems] = useState<string[]>([]);

    // Efeitos
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);

            // Fetch primary data
            const { data: productsData, error: productsError } = await supabase.from('products').select('*');
            if (productsError) console.error('Erro ao buscar produtos:', productsError.message);
            
            const { data: categoriesData, error: categoriesError } = await supabase.from('categories').select('*');
            if (categoriesError) console.error('Erro ao buscar categorias:', categoriesError.message);
            else setCategories([{ id: 1, name: 'Todos' }, ...(categoriesData || [])]);
            
            const { data: kitsData, error: kitsError } = await supabase.from('kits').select('*');
            if(kitsError) console.error('Erro ao buscar kits:', kitsError.message);
            
            const { data: highlightsData, error: highlightsError } = await supabase.from('highlights').select('*').order('sort_order', { ascending: true });
            if(highlightsError) console.error('Erro ao buscar destaques:', highlightsError.message);

            // Fetch association data for kits
            const { data: kitProductsData, error: kitProductsError } = await supabase.from('kit_products').select('*');
            if(kitProductsError) console.error('Erro ao buscar produtos dos kits:', kitProductsError.message);

            // Process products with their categories from the product table itself
            const localProducts: Product[] = (productsData || []).map(p => ({
                ...p,
                category_ids: p.category_ids || [], // Ensure category_ids is always an array
                stock: p.stock ?? 0, // Ensure stock is always a number
            }));
            setProducts(localProducts);

            // Process highlights
            if (highlightsData && localProducts) {
                const displayHighlights: DisplayHighlight[] = highlightsData.map(h => {
                    if (h.type === 'product' && h.product_id) {
                        const product = localProducts.find(p => p.id === h.product_id);
                        return { ...h, product };
                    }
                    return h;
                }).filter(h => h.type === 'image' || (h.type === 'product' && h.product));
                setHighlights(displayHighlights);
            }

            // Process kits
            if (kitsData && localProducts && kitProductsData) {
                 const kitsWithProducts: Kit[] = kitsData.map(kit => {
                    let parsedDescription = kit.description;
                    let parsedImages: string[] = [];
                    let parsedCategoryIds: number[] = [];

                    try {
                        const parsed = JSON.parse(kit.description);
                        parsedDescription = parsed.text || kit.description;
                        parsedImages = parsed.images || [];
                        parsedCategoryIds = parsed.categoryIds || [];
                    } catch (e) {
                        // It's a plain string, use defaults
                    }
                    
                    const productIds = kitProductsData.filter(kp => kp.kit_id === kit.id).map(kp => kp.product_id);
                    const kitProducts = localProducts.filter(p => productIds.includes(p.id));

                    return {
                        ...kit,
                        description: parsedDescription,
                        images: parsedImages,
                        products: kitProducts,
                        category_ids: parsedCategoryIds,
                    };
                });
                setKits(kitsWithProducts);
            } else if (kitsData) {
                setKits(kitsData.map(k => ({...k, products: [], images: [], category_ids: [] })));
            }
            
            setIsLoading(false);
        };
        fetchData();
    }, []);

    // Handlers
    const handleAddToCart = (item: DisplayItem, quantity: number, selectedSize?: string, customText?: string) => {
        setIsCartAnimating(true);
        setTimeout(() => setIsCartAnimating(false), 600);
    
        setCart(prevCart => {
            let cartItemId: string;
            let existingItem: CartItem | undefined;
    
            if (item.type === 'product') {
                const product = item.data;
                const sizePart = product.sizes?.length > 0 ? selectedSize : 'no-size';
                const customPart = product.is_customizable ? customText?.trim() || '' : 'no-custom';
                cartItemId = `product-${product.id}-${sizePart}-${customPart}`;
                existingItem = prevCart.find(i => i.cartItemId === cartItemId);
            } else {
                const kit = item.data;
                cartItemId = `kit-${kit.id}`;
                existingItem = prevCart.find(i => i.cartItemId === cartItemId);
            }
    
            if (existingItem) {
                return prevCart.map(i =>
                    i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + quantity } : i
                );
            } else {
                if (item.type === 'product') {
                    const newItem: CartProductItem = {
                        type: 'product',
                        data: item.data,
                        quantity,
                        selectedSize: selectedSize || '',
                        customText,
                        cartItemId
                    };
                    return [...prevCart, newItem];
                } else {
                    const newItem: CartKitItem = {
                        type: 'kit',
                        data: item.data,
                        quantity,
                        cartItemId
                    };
                    return [...prevCart, newItem];
                }
            }
        });
    };
    

    const handleUpdateCartQuantity = (cartItemId: string, newQuantity: number) => {
        if (newQuantity < 1) {
            handleRemoveFromCart(cartItemId);
            return;
        }
        setCart(cart => cart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item));
    };
    
    const handleRemoveFromCart = (cartItemId: string) => {
        setRemovingItems(prev => [...prev, cartItemId]);
        setTimeout(() => {
            setCart(cart => cart.filter(item => item.cartItemId !== cartItemId));
            setRemovingItems(prev => prev.filter(id => id !== cartItemId));
        }, 300);
    };
    
    const handleCheckout = () => {
        const total = cart.reduce((sum, item) => sum + item.data.price * item.quantity, 0);
        const message = `Olá! Gostaria de fazer o seguinte pedido:\n\n` +
            cart.map(item => {
                if(item.type === 'product') {
                    const detailsParts = [];
                    if (item.selectedSize && item.data.sizes?.length > 0) {
                        detailsParts.push(`Tamanho: ${item.selectedSize}`);
                    }
                    if (item.data.is_customizable && item.customText) {
                        detailsParts.push(`${item.data.custom_text_label || 'Personalização'}: "${item.customText}"`);
                    }
                    const details = detailsParts.length > 0 ? `(${detailsParts.join(', ')})` : '';

                    return `*${item.data.name}* ${details}\n` +
                           `  Quantidade: ${item.quantity}\n` +
                           `  Preço: R$ ${item.data.price.toFixed(2).replace('.', ',')}`;
                } else { // Kit
                     return `*${item.data.name} (Kit)*\n` +
                           `  Quantidade: ${item.quantity}\n` +
                           `  Preço: R$ ${item.data.price.toFixed(2).replace('.', ',')}`;
                }
            }).join('\n\n') +
            `\n\n*Total do Pedido: R$ ${total.toFixed(2).replace('.', ',')}*`;
        
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };
    
    const handleAdminLogin = () => {
        sessionStorage.setItem('isAdmin', 'true');
        setCurrentView('adminDashboard');
    };

    const handleDataChange = (newProducts, newCategories, newKits, newHighlights) => {
        setProducts(newProducts);
        const existingCategories = newCategories.filter(c => c.id !== 1);
        setCategories([{id: 1, name: 'Todos'}, ...existingCategories]);
        setKits(newKits);
        const displayHighlights: DisplayHighlight[] = newHighlights.map(h => {
             if (h.type === 'product' && h.product_id) {
                const product = newProducts.find(p => p.id === h.product_id);
                return { ...h, product };
            }
            return h;
        }).filter(h => h.type === 'image' || (h.type === 'product' && h.product));
        setHighlights(displayHighlights);
    };

    const navigateToStore = () => {
        setCurrentView('store');
        setSelectedCategory(1);
        setSearchQuery('');
    };
    
    const navigateToAdminLogin = () => {
        setCurrentView('adminLogin');
    };

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        if (query.trim() !== '') {
            setSelectedCategory(1); // Redefine para "Todos" quando uma consulta de pesquisa é inserida
        }
    };
    
    const handleCategoryClick = (categoryId: number) => {
        setSelectedCategory(categoryId);
        setSearchQuery(''); // Limpa a pesquisa quando uma categoria é selecionada
    };


    // Renderização
    const displayItems = useMemo((): DisplayItem[] => {
        const productItems: DisplayItem[] = products.map(p => ({ type: 'product', data: p }));
        const kitItems: DisplayItem[] = kits.map(k => ({ type: 'kit', data: k }));
        return [...productItems, ...kitItems].sort((a,b) => a.data.id - b.data.id);
    }, [products, kits]);

    const filteredDisplayItems = useMemo(() => {
        const lowercasedQuery = searchQuery.trim().toLowerCase();

        if (lowercasedQuery) {
            return displayItems.filter(item =>
                item.data.name.toLowerCase().includes(lowercasedQuery) ||
                item.data.description.toLowerCase().includes(lowercasedQuery)
            );
        }

        if (selectedCategory === 1) {
            return displayItems;
        }

        return displayItems.filter(item => (item.data.category_ids || []).includes(selectedCategory));
    }, [displayItems, searchQuery, selectedCategory]);

    const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    
    if (currentView === 'adminLogin') {
        return <AdminLogin onLogin={handleAdminLogin} onBackToStore={navigateToStore} />;
    }
    
    if (currentView === 'adminDashboard') {
        return <AdminDashboard initialProducts={products} initialCategories={categories} initialKits={kits} initialHighlights={highlights} onDataChange={handleDataChange} onBackToStore={navigateToStore} />;
    }

    return (
        <>
            <Header
                onCartClick={() => setIsCartOpen(true)}
                cartItemCount={cartItemCount}
                onLogoClick={navigateToStore}
                isCartAnimating={isCartAnimating}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
            />
            <main>
                <Carousel items={highlights} onProductClick={setSelectedDisplayItem} />
                <div className="category-filters">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`category-button ${selectedCategory === cat.id ? 'active' : ''}`}
                            onClick={() => handleCategoryClick(cat.id)}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="product-grid">
                        {Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)}
                    </div>
                ) : (
                    <div className="product-grid">
                        {filteredDisplayItems.length > 0 ? (
                            filteredDisplayItems.map(item => (
                                <ProductCard key={`${item.type}-${item.data.id}`} item={item} onProductClick={setSelectedDisplayItem} />
                            ))
                        ) : (
                            <p className="no-results-message">
                                {searchQuery ? `Nenhum resultado encontrado para "${searchQuery}".` : 'Nenhum produto encontrado nesta categoria.'}
                            </p>
                        )}
                    </div>
                )}
            </main>
            <Footer onAdminClick={navigateToAdminLogin} />

            {selectedDisplayItem && <ProductDetailModal item={selectedDisplayItem} onClose={() => setSelectedDisplayItem(null)} onAddToCart={handleAddToCart} />}
            {isCartOpen && <CartModal cart={cart} onClose={() => setIsCartOpen(false)} onUpdateQuantity={handleUpdateCartQuantity} onRemoveItem={handleRemoveFromCart} onCheckout={handleCheckout} removingItems={removingItems} />}
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);