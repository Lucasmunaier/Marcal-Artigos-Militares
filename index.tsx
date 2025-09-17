import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';


// --- TIPOS DE DADOS ---
interface ProductImage {
    url: string;
    zoom: number;
    pos_x: number;
    pos_y: number;
}

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    images: ProductImage[];
    sizes: string[];
    category_ids: number[];
    is_customizable: boolean;
    custom_text_label: string | null;
    stock: { [key: string]: number } | number;
}

interface Category {
    id: number;
    name: string;
    parent_id?: number | null;
    product_order?: number[] | null;
    item_order?: { type: 'product' | 'kit'; id: number }[] | null;
}

interface Kit {
    id: number;
    name: string;
    description: string;
    price: number;
    images: string[];
    products: Product[];
    category_ids: number[];
    discount_percentage?: number;
    sort_order?: number;
}

interface Highlight {
    id: number;
    type: 'product' | 'image';
    product_id: number | null;
    image_url: string | null;
    title: string | null;
    subtitle: string | null;
    sort_order: number;
    zoom: number;
    pos_x: number;
    pos_y: number;
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

interface KitProductConfiguration {
    id: string;
    productId: number;
    size?: string;
    customText?: string;
    quantity: number | string;
}

interface CartKitItem {
    type: 'kit';
    data: Kit;
    quantity: number;
    cartItemId: string;
    productConfigurations: KitProductConfiguration[];
    originalPrice?: number;
}

type CartItem = CartProductItem | CartKitItem;


// --- CLIENTE SUPABASE REAL ---
const SUPABASE_URL = 'https://icqaffyqnwuetfnslcif.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcWFmZnlxbnd1ZXRmbnNsY2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MTI0MzEsImV4cCI6MjA3MzE4ODQzMX0.-ob_QS2esdbrBlgYL2rnXTPsVH5fYcWIUEbext1ILuM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CONFIGURAÇÕES ---
const ADMIN_PASSWORD = 'admin'; // Senha para o painel de administração
const WHATSAPP_NUMBER = '5531993855369'; // Número do WhatsApp para receber os pedidos
const INSTAGRAM_PROFILE = ''; // Nome de usuário do seu Instagram
const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/F0EFEA/3C3C3B?text=Sem+Imagem';
const ICON_URL = 'https://icqaffyqnwuetfnslcif.supabase.co/storage/v1/object/public/site-assets/icon.png';

// --- FUNÇÕES HELPER ---
const sanitizeFileName = (fileName: string): string => {
    // Normalize to NFD Unicode form to separate diacritics from letters
    const normalized = fileName.normalize("NFD");
    // Remove diacritics
    const withoutDiacritics = normalized.replace(/[\u0300-\u036f]/g, "");
    // Replace spaces with underscores
    const withUnderscores = withoutDiacritics.replace(/\s+/g, '_');
    // Remove any character that is not a letter, number, dot, underscore, or hyphen
    const sanitized = withUnderscores.replace(/[^a-zA-Z0-9._-]/g, '');
    return sanitized;
};

const getProductStock = (product: Product | undefined | null): { [key: string]: number } => {
    if (!product || !product.stock) {
        return { default: 0 };
    }
    // Handle legacy number format
    if (typeof product.stock === 'number') {
        return { default: product.stock };
    }
    if (typeof product.stock === 'object' && product.stock !== null && !Array.isArray(product.stock)) {
        const sanitizedStock: { [key: string]: number } = {};
        for (const [key, value] of Object.entries(product.stock)) {
            const numValue = parseInt(String(value), 10);
            sanitizedStock[key] = isNaN(numValue) ? 0 : numValue;
        }
        return sanitizedStock;
    }
    return { default: 0 };
};

const isProductTotallyOutOfStock = (product: Product): boolean => {
    if (!product) return true;
    const stockData = getProductStock(product);
    
    // Sum all available stock quantities, regardless of any specific 'sizes' array.
    // This is more robust against potential data inconsistencies.
    const totalStock = Object.values(stockData).reduce((sum, currentStock) => {
        // Ensure we are adding numbers
        return sum + (Number(currentStock) || 0);
    }, 0);

    return totalStock <= 0;
};

/**
 * Custom hook to observe when an element enters the viewport.
 */
const useIntersectionObserver = (options: IntersectionObserverInit) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const element = ref.current;
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Update state when element is intersecting
                if (entry.isIntersecting) {
                    setIsIntersecting(true);
                    // Stop observing once it's visible to save resources
                    if (element) {
                        observer.unobserve(element);
                    }
                }
            },
            options
        );

        if (element) {
            observer.observe(element);
        }

        return () => {
            if (element) {
                observer.unobserve(element);
            }
        };
    }, [options]); // Re-run effect only if options object changes identity

    return [ref, isIntersecting] as const;
};


// --- COMPONENTES DA UI ---
const FramedImage = ({ image, className, altText, isVisible = true }: { image: ProductImage | null, className?: string, altText: string, isVisible?: boolean }) => {
    let styles: React.CSSProperties = {};

    if (isVisible) {
        if (image) {
            styles = {
                backgroundImage: `url(${image.url})`,
                backgroundSize: `${image.zoom * 100}%`,
                backgroundPosition: `${image.pos_x * 100}% ${image.pos_y * 100}%`,
            };
        } else {
            styles = {
                backgroundImage: `url(${PLACEHOLDER_IMAGE})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
            };
        }
    } else {
        // Use a background color from the theme to hold the space without a network request
        styles.backgroundColor = 'var(--light-color)';
    }

    return <div className={`framed-image ${className || ''}`} style={styles} role="img" aria-label={altText}></div>;
};


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
        <div className="header-actions">
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
        </div>
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
        let imageUrl: string | undefined, title, subtitle, price, isClickable = false, clickHandler = () => {};
        let zoom = 1, pos_x = 0.5, pos_y = 0.5;

        if (item.type === 'product' && item.product) {
            const firstImage = item.product.images?.[0];
            imageUrl = firstImage?.url;
            title = item.product.name;
            price = item.product.price;
            isClickable = true;
            clickHandler = () => onProductClick({ type: 'product', data: item.product });
            if (firstImage) {
                zoom = firstImage.zoom;
                pos_x = firstImage.pos_x;
                pos_y = firstImage.pos_y;
            }
        } else if (item.type === 'image') {
            imageUrl = item.image_url ?? undefined;
            title = item.title;
            subtitle = item.subtitle;
            zoom = item.zoom;
            pos_x = item.pos_x;
            pos_y = item.pos_y;
        }

        const backgroundStyles = {
            backgroundImage: `url(${imageUrl || PLACEHOLDER_IMAGE})`,
            backgroundSize: `${(zoom || 1) * 100}%`,
            backgroundPosition: `${(pos_x || 0.5) * 100}% ${(pos_y || 0.5) * 100}%`,
        };

        return (
            <div className={`carousel-slide ${isClickable ? 'clickable' : ''}`} onClick={clickHandler}>
                <div className="carousel-slide-image" style={backgroundStyles} />
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
    // Options for the observer to start loading images before they are on screen
    const observerOptions = useMemo(() => ({
        rootMargin: '200px 0px', // Start loading when the item is 200px away from the viewport vertically
        threshold: 0.01
    }), []);

    const [ref, isVisible] = useIntersectionObserver(observerOptions);

    const isOutOfStock = useMemo(() => {
        return item.type === 'product' && isProductTotallyOutOfStock(item.data as Product);
    }, [item]);
    
    const kitData = item.type === 'kit' ? item.data as Kit : null;
    const hasDiscount = !!(kitData?.discount_percentage && kitData.discount_percentage > 0);
    
    const imageObject = item.type === 'product' ? item.data.images?.[0] : null;
    const kitImageUrl = item.type === 'kit' ? item.data.images?.[0] : null;

    return (
        <div ref={ref} className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`} onClick={() => !isOutOfStock && onProductClick(item)}>
            {isOutOfStock && <span className="item-badge stock-badge">Sem Estoque</span>}
            {hasDiscount && <span className="item-badge discount-badge">-{kitData?.discount_percentage}%</span>}
            {item.type === 'kit' && <span className="item-badge kit-badge">KIT</span>}
            
            {item.type === 'product' ? (
                <FramedImage image={imageObject} isVisible={isVisible} className="product-card-image" altText={item.data.name} />
            ) : (
                <img src={kitImageUrl || PLACEHOLDER_IMAGE} alt={item.data.name} className="product-card-image-kit" loading="lazy" />
            )}
            <div className="product-card-info">
                <h3>{item.data.name}</h3>
                <p className="price">R$ {item.data.price.toFixed(2).replace('.', ',')}</p>
            </div>
        </div>
    );
};

const ProductDetailModal = ({ item, onClose, onAddToCart }) => {
    const [quantity, setQuantity] = useState<number | string>(1);
    const [selectedSize, setSelectedSize] = useState('');
    const [customText, setCustomText] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [kitConfigurations, setKitConfigurations] = useState<KitProductConfiguration[]>([]);
    const [validationAttempted, setValidationAttempted] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const images = useMemo(() => (item.type === 'product' ? item.data.images : (item.data.images || []).map(url => ({ url, zoom: 1, pos_x: 0.5, pos_y: 0.5 })) ) || [], [item]);
    const mainImage = images[currentImageIndex] || null;
    
    const handlePrevImage = () => setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    const handleNextImage = () => setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));

    const stockData = useMemo(() => (item.type === 'product' ? getProductStock(item.data as Product) : {}), [item]);

    const originalKitPrice = useMemo(() => {
        if (item.type !== 'kit') return item.data.price;
        
        return kitConfigurations.reduce((total, config) => {
            const product = (item.data.products || []).find(p => p.id === config.productId);
            const itemQuantity = Number(config.quantity) || 0;
            return total + ((product?.price || 0) * itemQuantity);
        }, 0);
    }, [item, kitConfigurations]);

    const discountedKitPrice = useMemo(() => {
        if (item.type !== 'kit') return null;
        const kit = item.data as Kit;
        if (!kit.discount_percentage || kit.discount_percentage <= 0) return null;

        const discountMultiplier = 1 - (kit.discount_percentage / 100);
        return originalKitPrice * discountMultiplier;
    }, [item, originalKitPrice]);

    useEffect(() => {
        setCurrentImageIndex(0);
        if (item.type === 'product') {
            setSelectedSize(''); // Force user to select
        } else if (item.type === 'kit') {
            const initialConfigs = (item.data.products || []).map(p => ({
                id: `${p.id}-${Date.now()}-${Math.random()}`,
                productId: p.id,
                size: '',
                customText: '',
                quantity: 1,
            }));
            setKitConfigurations(initialConfigs);
        }
    }, [item]);

    const handleKitConfigurationChange = (configId: string, field: 'size' | 'customText' | 'quantity', value: string) => {
        setKitConfigurations(prev => prev.map(config => 
            config.id === configId ? { ...config, [field]: value } : config
        ));
    };

    const handleAddKitProductInstance = (productId: number) => {
        const newInstance: KitProductConfiguration = {
            id: `${productId}-${Date.now()}-${Math.random()}`,
            productId: productId,
            size: '',
            customText: '',
            quantity: 1,
        };
        setKitConfigurations(prev => [...prev, newInstance]);
    };
    
    const handleRemoveKitProductInstance = (configId: string) => {
        setKitConfigurations(prev => prev.filter(config => config.id !== configId));
    };

    const handleAddToCartClick = () => {
        const finalQuantity = Math.max(1, Number(quantity) || 1);

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
            // Check stock for the selected size
             if (product.sizes?.length > 0) {
                const availableStock = stockData[selectedSize] ?? 0;
                if (finalQuantity > availableStock) {
                    alert(`Desculpe, temos apenas ${availableStock} unidades do tamanho ${selectedSize} em estoque.`);
                    return;
                }
            } else { // No sizes
                 const availableStock = stockData['default'] ?? 0;
                 if (finalQuantity > availableStock) {
                    alert(`Desculpe, temos apenas ${availableStock} unidades em estoque.`);
                    return;
                }
            }
            onAddToCart(item, finalQuantity, selectedSize, customText);
        } else { // It's a kit
            setValidationAttempted(true);
            let isInvalid = false;
            for (const config of kitConfigurations) {
                 const product = (item.data.products || []).find(p => p.id === config.productId);
                if (!product) continue;
                if ((product.is_customizable && !config?.customText?.trim()) || (product.sizes?.length > 0 && !config?.size)) {
                    isInvalid = true;
                    break;
                }
            }

            if (isInvalid) {
                return; // Visual feedback will show the user what's wrong
            }

             const finalPrice = discountedKitPrice !== null ? discountedKitPrice : originalKitPrice;
             const kitWithFinalPrice = {
                ...item,
                data: {
                    ...item.data,
                    price: finalPrice
                }
            };
            onAddToCart(kitWithFinalPrice, 1, undefined, undefined, kitConfigurations, originalKitPrice);
        }
        
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
        }, 1500);
    };
    
    const isItemTotallyOutOfStock = useMemo(() => item.type === 'product' && isProductTotallyOutOfStock(item.data as Product), [item]);
    
    const isSelectedVariantOutOfStock = useMemo(() => {
        if (item.type !== 'product') return false;
        const product = item.data as Product;
        if (product.sizes && product.sizes.length > 0) {
            // Only consider it out of stock if a size has been selected
            if (!selectedSize) return false;
            return (stockData[selectedSize] ?? 0) <= 0;
        }
        return (stockData['default'] ?? 0) <= 0;
    }, [item, selectedSize, stockData]);
    
    const isKitConfigurationInvalid = useMemo(() => {
        if (item.type !== 'kit') return false;
        for (const config of kitConfigurations) {
            const product = (item.data.products || []).find(p => p.id === config.productId);
            if (!product) return true; // Should not happen

            if (product.is_customizable && !config.customText?.trim()) return true;
            if (product.sizes?.length > 0 && !config.size) return true;
            if ((Number(config.quantity) || 0) < 1) return true;
        }
        return false;
    }, [item, kitConfigurations]);

    const renderProductDetails = () => {
        const product = item.data as Product;
        return (
             <div className="product-controls">
                {product.sizes && product.sizes.length > 0 && (
                    <div className="form-group">
                        <label htmlFor="size">Tamanho:</label>
                        <select id="size" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                            <option value="" disabled>Selecione um tamanho</option>
                            {product.sizes.map(size => {
                                const sizeStock = stockData[size] ?? 0;
                                const isSizeOutOfStock = sizeStock <= 0;
                                return (
                                    <option key={size} value={size} disabled={isSizeOutOfStock}>
                                        {size} {isSizeOutOfStock ? '(Esgotado)' : ''}
                                    </option>
                                );
                            })}
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
                    <input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" />
                </div>
            </div>
        );
    }
    
    const renderKitDetails = () => {
        const kit = item.data as Kit;
        const allProductsInKit = kit.products || [];

        return (
            <div className="kit-details">
                <div className="kit-configuration-section">
                    <h4>Configure os itens do kit:</h4>
                    {allProductsInKit.map(p => {
                        const configsForThisProduct = kitConfigurations.filter(c => c.productId === p.id);
                        if (configsForThisProduct.length === 0) return null;
                        const productStock = getProductStock(p);
                        
                        return (
                            <div key={p.id} className="kit-product-group">
                                <div className="kit-product-config-header">
                                    <h5>{p.name}</h5>
                                    <button className="add-instance-button" onClick={() => handleAddKitProductInstance(p.id)}>+ Adicionar outro</button>
                                </div>
                                {configsForThisProduct.map(config => (
                                    <div key={config.id} className="kit-product-config-item">
                                        {configsForThisProduct.length > 1 && (
                                            <button className="remove-instance-button" onClick={() => handleRemoveKitProductInstance(config.id)}>&times;</button>
                                        )}
                                        <div className="kit-product-controls">
                                            {p.sizes?.length > 0 && (
                                                <div className="form-group">
                                                    <label htmlFor={`kit-prod-size-${config.id}`}>Tamanho:</label>
                                                    <select 
                                                        id={`kit-prod-size-${config.id}`} 
                                                        value={config.size || ''} 
                                                        onChange={(e) => handleKitConfigurationChange(config.id, 'size', e.target.value)}
                                                        className={validationAttempted && p.sizes?.length > 0 && !config.size ? 'invalid' : ''}
                                                    >
                                                        <option value="" disabled>Selecione</option>
                                                        {p.sizes.map(size => {
                                                            const isOutOfStock = (productStock[size] ?? 0) <= 0;
                                                            return <option key={size} value={size} disabled={isOutOfStock}>{size} {isOutOfStock ? '(Esgotado)' : ''}</option>;
                                                        })}
                                                    </select>
                                                </div>
                                            )}
                                            {p.is_customizable && (
                                                <div className="form-group">
                                                    <label htmlFor={`kit-prod-custom-${config.id}`}>{p.custom_text_label || 'Personalização'}</label>
                                                    <input 
                                                        type="text" 
                                                        id={`kit-prod-custom-${config.id}`} 
                                                        value={config.customText || ''}
                                                        onChange={(e) => handleKitConfigurationChange(config.id, 'customText', e.target.value)}
                                                        placeholder="Digite o texto"
                                                        className={validationAttempted && p.is_customizable && !config.customText?.trim() ? 'invalid' : ''}
                                                    />
                                                </div>
                                            )}
                                             <div className="form-group">
                                                <label htmlFor={`kit-prod-qty-${config.id}`}>Qtd:</label>
                                                <input
                                                    id={`kit-prod-qty-${config.id}`}
                                                    type="number"
                                                    value={config.quantity}
                                                    onChange={(e) => handleKitConfigurationChange(config.id, 'quantity', e.target.value)}
                                                    min="1"
                                                    className="kit-item-quantity-input"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>&times;</button>
                <div className={`product-detail ${item.type === 'kit' ? 'kit-modal-layout' : ''}`}>
                    <div className="product-detail-images">
                         <div className="modal-image-nav-container">
                            <FramedImage image={mainImage} className="main-image" altText={item.data.name} />
                             {images.length > 1 && (
                                <>
                                    <button onClick={handlePrevImage} className="modal-image-nav left" aria-label="Imagem anterior">&#10094;</button>
                                    <button onClick={handleNextImage} className="modal-image-nav right" aria-label="Próxima imagem">&#10095;</button>
                                </>
                            )}
                         </div>
                        {images.length > 1 && (
                            <div className="thumbnail-gallery">
                                {images.map((img, index) => (
                                    <img 
                                        key={index}
                                        src={img.url}
                                        alt={`Thumbnail ${index + 1}`}
                                        className={currentImageIndex === index ? 'active' : ''}
                                        onClick={() => setCurrentImageIndex(index)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="product-detail-info">
                        <h2>{item.data.name}</h2>
                        {item.type === 'kit' && discountedKitPrice !== null ? (
                            <div className="price-container">
                                <p className="price discounted">R$ {discountedKitPrice.toFixed(2).replace('.', ',')}</p>
                                <p className="price original">R$ {originalKitPrice.toFixed(2).replace('.', ',')}</p>
                                {item.data.discount_percentage && item.data.discount_percentage > 0 && (
                                    <span className="discount-percentage-badge">-{item.data.discount_percentage}%</span>
                                )}
                            </div>
                        ) : (
                            <p className="price">R$ {
                                (item.type === 'kit' ? originalKitPrice : item.data.price).toFixed(2).replace('.', ',')
                            }</p>
                        )}
                        {isItemTotallyOutOfStock && <p className="stock-message-error">Produto Esgotado</p>}
                        <p className="description">{item.data.description}</p>
                        
                        {item.type === 'product' ? renderProductDetails() : renderKitDetails()}

                        <button 
                            className={`add-to-cart-button ${showSuccess ? 'success' : ''}`} 
                            onClick={handleAddToCartClick} 
                            disabled={showSuccess || isItemTotallyOutOfStock || isSelectedVariantOutOfStock || isKitConfigurationInvalid}
                        >
                            {isItemTotallyOutOfStock ? (
                                'Produto Esgotado'
                             ) : isSelectedVariantOutOfStock ? (
                                'Tamanho Esgotado'
                             ) : isKitConfigurationInvalid ? (
                                'Configure o Kit'
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
                             const imageObject = item.type === 'product' ? item.data.images?.[0] : null;
                             const kitImageUrl = item.type === 'kit' ? item.data.images?.[0] : null;

                            return (
                                <div key={item.cartItemId} className={`cart-item ${removingItems.includes(item.cartItemId) ? 'removing' : ''}`}>
                                    {item.type === 'product' ? (
                                        <FramedImage image={imageObject} className="cart-item-image" altText={item.data.name} />
                                    ) : (
                                        <img src={kitImageUrl || PLACEHOLDER_IMAGE} alt={item.data.name} className="cart-item-image" />
                                    )}
                                    <div className="cart-item-info">
                                        <h4>{item.data.name} {item.type === 'kit' && '(Kit)'}</h4>
                                        {item.type === 'product' && item.selectedSize && item.data.sizes?.length > 0 && <p>Tamanho: {item.selectedSize}</p>}
                                        {item.type === 'product' && item.data.is_customizable && item.customText && <p>{item.data.custom_text_label || 'Personalização'}: "{item.customText}"</p>}
                                        {item.type === 'kit' && item.productConfigurations && (
                                            <ul className="cart-item-kit-configurations">
                                                {(item.data.products || []).map(product => {
                                                    const configs = (item as CartKitItem).productConfigurations.filter(c => c.productId === product.id);
                                                    if (configs.length === 0) return null;

                                                    return (
                                                        <li key={product.id} className="cart-kit-product-group">
                                                            <strong>- {product.name}:</strong>
                                                            <ul>
                                                                {configs.map(config => {
                                                                    const details = [];
                                                                    if (config.size) details.push(`Tamanho: ${config.size}`);
                                                                    if (config.customText) details.push(`${product.custom_text_label || 'Personalização'}: "${config.customText}"`);
                                                                    if (Number(config.quantity) > 0) details.push(`Qtd: ${config.quantity}`);
                                                                    return <li key={config.id}>{details.join(', ')}</li>;
                                                                })}
                                                            </ul>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                        {(item as CartKitItem).originalPrice && (item as CartKitItem).originalPrice! > item.data.price ? (
                                            <div className="cart-item-price-container">
                                                <p className="cart-item-price">R$ {item.data.price.toFixed(2).replace('.', ',')}</p>
                                                <p className="cart-item-price original">R$ {(item as CartKitItem).originalPrice!.toFixed(2).replace('.', ',')}</p>
                                            </div>
                                        ) : (
                                            <p>R$ {item.data.price.toFixed(2).replace('.', ',')}</p>
                                        )}
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
    const [activeView, setActiveView] = useState<'menu' | 'products' | 'categories' | 'kits' | 'stock' | 'highlights' | 'itemOrdering'>('menu');

    // Estados de Edição
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingKit, setEditingKit] = useState<Kit | null>(null);
    const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [editingCategoryParent, setEditingCategoryParent] = useState<string>('');
    const [editingProductImage, setEditingProductImage] = useState<{ index: number; data: ProductImage } | null>(null);
    const [isHighlightEditorOpen, setIsHighlightEditorOpen] = useState(false);
    const [productSearchQuery, setProductSearchQuery] = useState('');


    // Estados de Loading
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
    
    // Drag and Drop
    const [draggedItem, setDraggedItem] = useState<{ list: string; index: number; ids: (string | number)[] } | null>(null);
    const [draggedCategoryId, setDraggedCategoryId] = useState<number | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null); // 'cat-id', 'top-level'
    const [draggingSourceIds, setDraggingSourceIds] = useState<Set<string | number>>(new Set());
    const [selectedItems, setSelectedItems] = useState<{ [key: string]: Set<string | number> }>({
        product_images: new Set(),
        kit_images: new Set(),
        highlights: new Set(),
        item_ordering: new Set(),
    });


    // Formulário de produto
    const [productForm, setProductForm] = useState({ name: '', description: '', price: '', category_ids: [] as number[], sizes: '', has_sizes: false, is_customizable: false, custom_text_label: 'Nome' });
    const [productFormStock, setProductFormStock] = useState<{ [key: string]: string }>({});
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviewObjects, setImagePreviewObjects] = useState<ProductImage[]>([]);
    
    // Formulário de Kit
    const [kitForm, setKitForm] = useState({ name: '', description: '', price: '', category_ids: [] as number[], discount_percentage: '' });
    const [kitImageFiles, setKitImageFiles] = useState<File[]>([]);
    const [kitImagePreviews, setKitImagePreviews] = useState<string[]>([]);
    const [kitExistingImages, setKitExistingImages] = useState<string[]>([]);
    const [selectedKitProducts, setSelectedKitProducts] = useState<Set<number>>(new Set());
    const [kitProductSearch, setKitProductSearch] = useState('');

    // Formulário de Destaque
    const [highlightForm, setHighlightForm] = useState({ type: 'product' as 'product' | 'image', product_id: '', title: '', subtitle: '', zoom: 1, pos_x: 0.5, pos_y: 0.5 });
    const [highlightImageFile, setHighlightImageFile] = useState<File | null>(null);
    const [highlightImagePreview, setHighlightImagePreview] = useState<string | null>(null);
    const highlightEditorRef = useRef<HTMLDivElement>(null);

    // Estado de Estoque
    const [stockLevels, setStockLevels] = useState<{ [key: number]: { [key: string]: string } }>({});
    const [stockChanges, setStockChanges] = useState<{ [key: number]: { [key: string]: number } }>({});

    // Estado de Ordenação de Itens
    const [itemOrderingCategoryId, setItemOrderingCategoryId] = useState<number | null>(null);
    const [orderedItems, setOrderedItems] = useState<DisplayItem[]>([]);
    const [initialItemOrder, setInitialItemOrder] = useState<{ type: 'product' | 'kit'; id: number }[]>([]);
    
    // Modal de Exclusão de Categoria
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        category: Category;
        productsInvolved: Product[];
        allDescendantIds: number[];
        targetCategoryId: string;
    } | null>(null);


    useEffect(() => {
        const initialStocks = initialProducts.reduce((acc, p) => {
            const stockData = getProductStock(p);
            acc[p.id] = Object.fromEntries(
                Object.entries(stockData).map(([key, value]) => [key, String(value)])
            );
            return acc;
        }, {} as { [key: number]: { [key: string]: string } });
        setStockLevels(initialStocks);
        setStockChanges({});
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
            const stockData = getProductStock(editingProduct);
            const stockForForm = Object.entries(stockData).reduce((acc, [size, qty]) => {
                acc[size] = String(qty);
                return acc;
            }, {} as { [key: string]: string });
            setProductFormStock(stockForForm);
            setImagePreviewObjects(safeImages);
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
                discount_percentage: (editingKit.discount_percentage || '').toString(),
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
            const initialFormState = {
                type: editingHighlight.type,
                product_id: editingHighlight.product_id?.toString() || '',
                title: editingHighlight.title || '',
                subtitle: editingHighlight.subtitle || '',
                zoom: editingHighlight.zoom || 1,
                pos_x: editingHighlight.pos_x || 0.5,
                pos_y: editingHighlight.pos_y || 0.5
            };
            setHighlightForm(initialFormState);
            setHighlightImageFile(null);
            setHighlightImagePreview(editingHighlight.image_url || null);
            setActiveView('highlights');
        } else {
            resetHighlightForm();
        }
    }, [editingHighlight]);

    useEffect(() => {
        if (itemOrderingCategoryId !== null) {
            if (itemOrderingCategoryId === 1) { // Handle "Todos"
                const allProducts: DisplayItem[] = products.map(p => ({ type: 'product', data: p }));
                const allKits: DisplayItem[] = kits.map(k => ({ type: 'kit', data: k }));
                const allItems = [...allProducts, ...allKits].sort((a, b) => a.data.name.localeCompare(b.data.name));
                setOrderedItems(allItems);
                // No initial order to compare against for "Todos"
                setInitialItemOrder(allItems.map(item => ({ type: item.type, id: item.data.id })));
                return;
            }

            const category = categories.find(c => c.id === itemOrderingCategoryId);
            const itemOrder = category?.item_order || [];
            
            const getDescendantIds = (catId: number, allCats: Category[]): number[] => {
                const children = allCats.filter(c => c.parent_id === catId);
                let descendantIds: number[] = children.map(c => c.id);
                children.forEach(child => {
                    descendantIds = [...descendantIds, ...getDescendantIds(child.id, allCats)];
                });
                return descendantIds;
            };

            const categoryIdsToFilter = [itemOrderingCategoryId, ...getDescendantIds(itemOrderingCategoryId, categories)];
            
            const productsInCategory: DisplayItem[] = products
                .filter(p => p.category_ids.some(id => categoryIdsToFilter.includes(id)))
                .map(p => ({ type: 'product', data: p }));
                
            const kitsInCategory: DisplayItem[] = kits
                .filter(k => (k.category_ids || []).some(id => categoryIdsToFilter.includes(id)))
                .map(k => ({ type: 'kit', data: k }));

            const allItemsInCategory = [...productsInCategory, ...kitsInCategory];
            
            const orderMap = new Map(itemOrder.map((item, index) => [`${item.type}-${item.id}`, index]));

            const sorted = [...allItemsInCategory].sort((a, b) => {
                const keyA = `${a.type}-${a.data.id}`;
                const keyB = `${b.type}-${b.data.id}`;
                const indexA = orderMap.get(keyA);
                const indexB = orderMap.get(keyB);

                if (indexA === undefined && indexB === undefined) return a.data.name.localeCompare(b.data.name);
                if (indexA === undefined) return 1;
                if (indexB === undefined) return -1;
                return indexA - indexB;
            });
            setOrderedItems(sorted);
            setInitialItemOrder(sorted.map(item => ({ type: item.type, id: item.data.id })));
        } else {
            setOrderedItems([]);
            setInitialItemOrder([]);
        }
    }, [itemOrderingCategoryId, products, categories, kits]);

    useEffect(() => {
        if (products.length > 0 && activeView === 'kits') {
            const productImages = products
                .filter(p => selectedKitProducts.has(p.id))
                .flatMap(p => p.images.map(img => img.url)) // Changed to handle ProductImage[]
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
        setProductFormStock({});
        imagePreviewObjects.forEach(img => { if (img.url.startsWith('blob:')) URL.revokeObjectURL(img.url); });
        setImageFiles([]);
        setImagePreviewObjects([]);
        setEditingProduct(null);
    };

    const resetKitForm = () => {
        setKitForm({ name: '', description: '', price: '', category_ids: [], discount_percentage: '' });
        kitImagePreviews.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
        setKitImageFiles([]);
        setKitImagePreviews([]);
        setKitExistingImages([]);
        setSelectedKitProducts(new Set());
        setKitProductSearch('');
        setEditingKit(null);
    };

    const resetHighlightForm = () => {
        setHighlightForm({ type: 'product', product_id: '', title: '', subtitle: '', zoom: 1, pos_x: 0.5, pos_y: 0.5 });
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
            if (isKit) {
                const newPreviews = files.map(file => URL.createObjectURL(file));
                setKitImageFiles(prev => [...prev, ...files]);
                setKitImagePreviews(prev => [...prev, ...newPreviews]);
            } else {
                setImageFiles(prev => [...prev, ...files]);
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            const imageAspectRatio = img.width / img.height;
                            const containerAspectRatio = 1; // Square
                            const coverZoom = Math.max(1, containerAspectRatio / imageAspectRatio);
                            const newImageObject: ProductImage = {
                                url: URL.createObjectURL(file),
                                zoom: coverZoom,
                                pos_x: 0.5,
                                pos_y: 0.5,
                            };
                            setImagePreviewObjects(prev => [...prev, newImageObject]);
                        }
                        img.src = event.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                });
            }
        }
    };
    
    const removeImage = (index: number, isKit: boolean) => {
        if (isKit) {
            // Kit image removal logic
            const urlToRemove = kitImagePreviews[index];
            if (urlToRemove.startsWith('blob:')) {
                const blobPreviews = kitImagePreviews.filter(p => p.startsWith('blob:'));
                const fileIndex = blobPreviews.indexOf(urlToRemove);
                if (fileIndex > -1) {
                    setKitImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
                }
                URL.revokeObjectURL(urlToRemove);
            } else {
                setKitExistingImages(prev => prev.filter(img => img !== urlToRemove));
            }
            setKitImagePreviews(prev => prev.filter((_, i) => i !== index));
        } else {
            // Product image removal logic
            const imageToRemove = imagePreviewObjects[index];
            if (imageToRemove.url.startsWith('blob:')) {
                const blobUrls = imagePreviewObjects.map(p => p.url).filter(u => u.startsWith('blob:'));
                const fileIndex = blobUrls.indexOf(imageToRemove.url);
                if (fileIndex > -1) {
                    setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
                }
                URL.revokeObjectURL(imageToRemove.url);
            }
            setImagePreviewObjects(prev => prev.filter((_, i) => i !== index));
        }
    };
    
    const handleSelection = (list: string, id: string | number) => {
        setSelectedItems(prev => {
            const newSelection = new Set(prev[list]);
            if (newSelection.has(id)) {
                newSelection.delete(id);
            } else {
                newSelection.add(id);
            }
            return { ...prev, [list]: newSelection };
        });
    };

    const handleDragStart = (e: React.DragEvent, index: number, list: string, id: string | number) => {
        const currentSelection = selectedItems[list];
        const isDraggingSelected = currentSelection.has(id);
        let idsToDrag: (string | number)[];

        if (!isDraggingSelected) {
            // If dragging an unselected item, clear the current selection for this list
            // and start a new selection with just this item.
            const newSelection = new Set([id]);
            setSelectedItems(prev => ({ ...prev, [list]: newSelection }));
            idsToDrag = [id];
        } else {
            // If dragging an already selected item, drag the entire selection group.
            idsToDrag = Array.from(currentSelection);
        }
        
        setDraggedItem({ list, index, ids: idsToDrag });
        setDraggingSourceIds(new Set(idsToDrag));
    };

    const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
    };

    const handleDrop = (dropIndex: number, list: string) => {
        if (!draggedItem || draggedItem.list !== list) return;
        
        let currentItems: any[];
        let setter: (items: any[]) => void;
        let idResolver: (item: any, index: number) => string | number;

        if (list === 'highlights') {
            currentItems = highlights;
            setter = (newItems) => { setHighlights(newItems); handleSaveHighlightOrder(newItems); };
            idResolver = (item) => item.id;
        } else if (list === 'product_images') {
            currentItems = imagePreviewObjects;
            setter = setImagePreviewObjects;
            idResolver = (_, index) => index;
        } else if (list === 'kit_images') {
            currentItems = kitImagePreviews;
            setter = setKitImagePreviews;
            idResolver = (_, index) => index;
        } else if (list === 'item_ordering') {
            currentItems = orderedItems;
            setter = setOrderedItems;
            idResolver = (item) => `${item.type}-${item.data.id}`;
        } else {
            return;
        }

        const newItems = [...currentItems];
        const draggedIds = new Set(draggedItem.ids);
        
        const dropTargetId = idResolver(newItems[dropIndex], dropIndex);
        if (draggedIds.has(dropTargetId)) {
            return; // Dropping a group onto one of its own members, do nothing.
        }
        
        const movedItems = newItems.filter((item, index) => draggedIds.has(idResolver(item, index)));
        const remainingItems = newItems.filter((item, index) => !draggedIds.has(idResolver(item, index)));
        
        let targetIndexInRemaining = remainingItems.findIndex((item, index) => idResolver(item, index) === dropTargetId);
        
        if (targetIndexInRemaining === -1) {
             targetIndexInRemaining = remainingItems.length;
        }
        
        remainingItems.splice(targetIndexInRemaining, 0, ...movedItems);
        
        setter(remainingItems);
        setSelectedItems(prev => ({ ...prev, [list]: new Set() }));
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDraggedCategoryId(null);
        setDragOverTarget(null);
        setDraggingSourceIds(new Set());
    };

    const handleKitProductToggle = (productId: number) => {
        const newSet = new Set(selectedKitProducts);
        if (newSet.has(productId)) {
            newSet.delete(productId);
        } else {
            newSet.add(productId);
        }
        setSelectedKitProducts(newSet);
    
        // Debounced or throttled price update
        // Using useEffect to handle price calculation when selectedKitProducts changes
    };

    // Auto-calculate kit price
    useEffect(() => {
        if (activeView === 'kits') {
            const total = Array.from(selectedKitProducts).reduce((sum, pId) => {
                const product = products.find(p => p.id === pId);
                return sum + (product?.price || 0);
            }, 0);
    
            setKitForm(currentForm => ({
                ...currentForm,
                price: total > 0 ? total.toFixed(2) : ''
            }));
        }
    }, [selectedKitProducts, products, activeView]);
    
    const handleAddCategory = async (e) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('categoryName') as HTMLInputElement).value;
        const parentId = (form.elements.namedItem('parentId') as HTMLSelectElement).value;

        if (name && !categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
            setIsSubmitting(true);
            const categoryData = { name, parent_id: parentId ? parseInt(parentId, 10) : null };
            const { data: addedCategory, error } = await supabase.from('categories').insert(categoryData).select().single();
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
    
    const handleDeleteCategory = async (category: Category) => {
        const getAllDescendantIds = (catId: number): number[] => {
            const children = categories.filter(c => c.parent_id === catId);
            let ids = children.map(c => c.id);
            children.forEach(child => {
                ids = [...ids, ...getAllDescendantIds(child.id)];
            });
            return ids;
        };

        const allDescendantIds = getAllDescendantIds(category.id);
        const categoryIdsToCheck = [category.id, ...allDescendantIds];
        const productsInvolved = products.filter(p => p.category_ids.some(cid => categoryIdsToCheck.includes(cid)));
        const hasSubcategories = categories.some(c => c.parent_id === category.id);
        
        if (productsInvolved.length > 0) {
            setDeleteConfirmation({
                category,
                productsInvolved,
                allDescendantIds: categoryIdsToCheck,
                targetCategoryId: 'desassociate',
            });
            return;
        }

        if (window.confirm(`Tem certeza que deseja excluir a categoria "${category.name}"? ${hasSubcategories ? 'Suas subcategorias se tornarão categorias principais.' : ''}`)) {
            setDeletingItemId(`cat-${category.id}`);
            setIsSubmitting(true);
            
            // Make subcategories top-level
            const children = categories.filter(c => c.parent_id === category.id);
            if (children.length > 0) {
                const updates = children.map(c => supabase.from('categories').update({ parent_id: null }).eq('id', c.id));
                await Promise.all(updates);
            }

            const { error } = await supabase.from('categories').delete().eq('id', category.id);
            if (error) {
                alert('Erro ao excluir categoria: ' + error.message);
            } else {
                const newCategories = categories
                    .filter(c => c.id !== category.id)
                    .map(c => children.some(child => child.id === c.id) ? { ...c, parent_id: null } : c);
                setCategories(newCategories);
                onDataChange(products, newCategories, kits, highlights);
            }
            setIsSubmitting(false);
            setDeletingItemId(null);
        }
    };
    
    const handleConfirmDeleteCategory = async () => {
        if (!deleteConfirmation) return;

        setIsSubmitting(true);
        setDeletingItemId(`cat-${deleteConfirmation.category.id}`);
        const { category, productsInvolved, allDescendantIds, targetCategoryId } = deleteConfirmation;

        // 1. Update Products
        const productUpdates = productsInvolved.map(p => {
            let newCategoryIds = p.category_ids.filter(cid => !allDescendantIds.includes(cid));
            if (targetCategoryId !== 'desassociate') {
                const targetIdNum = parseInt(targetCategoryId, 10);
                if (!newCategoryIds.includes(targetIdNum)) {
                    newCategoryIds.push(targetIdNum);
                }
            }
            return supabase.from('products').update({ category_ids: newCategoryIds }).eq('id', p.id);
        });
        const productResults = await Promise.all(productUpdates);
        const productErrors = productResults.filter(res => res.error);
        if (productErrors.length > 0) {
            alert(`Erro ao mover ${productErrors.length} produtos. A operação foi abortada.`);
            setIsSubmitting(false);
            setDeletingItemId(null);
            return;
        }

        // 2. Update Subcategories to become top-level
        const children = categories.filter(c => c.parent_id === category.id);
        if (children.length > 0) {
            const childUpdates = children.map(c => supabase.from('categories').update({ parent_id: null }).eq('id', c.id));
            await Promise.all(childUpdates);
        }

        // 3. Delete the Category
        const { error: deleteError } = await supabase.from('categories').delete().eq('id', category.id);
        if (deleteError) {
             alert('Erro ao excluir categoria: ' + deleteError.message);
             // Note: At this point, products have already been moved.
        }
        
        // 4. Update local state
        const newProducts = products.map(p => {
            const involvedProduct = productsInvolved.find(pi => pi.id === p.id);
            if (!involvedProduct) return p;
            let newCategoryIds = p.category_ids.filter(cid => !allDescendantIds.includes(cid));
            if (targetCategoryId !== 'desassociate') {
                newCategoryIds.push(parseInt(targetCategoryId, 10));
            }
            return { ...p, category_ids: Array.from(new Set(newCategoryIds)) };
        });

        const newCategories = categories
            .filter(c => c.id !== category.id)
            .map(c => children.some(child => child.id === c.id) ? { ...c, parent_id: null } : c);

        setProducts(newProducts);
        setCategories(newCategories);
        onDataChange(newProducts, newCategories, kits, highlights);
        
        setDeleteConfirmation(null);
        setIsSubmitting(false);
        setDeletingItemId(null);
    };

    const handleStartEditCategory = (category: Category) => {
        setEditingCategory(category);
        setEditingCategoryName(category.name);
        setEditingCategoryParent(category.parent_id?.toString() || '');
    };

    const handleUpdateCategory = async (e) => {
        e.preventDefault();
        if (!editingCategory || !editingCategoryName.trim()) return;

        setIsSubmitting(true);
        const categoryData = {
            name: editingCategoryName,
            parent_id: editingCategoryParent ? parseInt(editingCategoryParent) : null
        };
        const { data: updatedCategory, error } = await supabase
            .from('categories')
            .update(categoryData)
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
        
        const uploadedImageUrls: { [key: string]: string } = {};
        const uploadPromises = imageFiles.map(async (file, index) => {
            const blobUrl = imagePreviewObjects.filter(p => p.url.startsWith('blob:'))[index].url;
            const filePath = `public/${Date.now()}-${sanitizeFileName(file.name)}`;
            const { error } = await supabase.storage.from('product-images').upload(filePath, file);
            if (error) throw new Error(`Erro no upload da imagem: ${error.message}`);
            const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
            uploadedImageUrls[blobUrl] = data.publicUrl;
        });

        try {
            await Promise.all(uploadPromises);
        } catch (error) {
            alert((error as Error).message);
            setIsSubmitting(false); return;
        }

        if (editingProduct) {
            const originalUrls = (editingProduct.images || []).map(img => img.url);
            const currentUrls = imagePreviewObjects.filter(p => !p.url.startsWith('blob:')).map(p => p.url);
            const urlsToRemove = originalUrls.filter(url => !currentUrls.includes(url));
            if (urlsToRemove.length > 0) {
                const imagePaths = urlsToRemove.map(url => new URL(url).pathname.split('/product-images/')[1]);
                await supabase.storage.from('product-images').remove(imagePaths);
            }
        }
        
        const finalImages: ProductImage[] = imagePreviewObjects.map(imgObj => ({
            ...imgObj,
            url: uploadedImageUrls[imgObj.url] || imgObj.url
        }));
        
        const stockToSave: { [key: string]: number } = {};
        const sizesArray = productForm.sizes.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        
        if (productForm.has_sizes) {
            Object.entries(productFormStock).forEach(([size, qty]) => {
                if (sizesArray.includes(size)) {
                    stockToSave[size] = qty === '' || isNaN(parseInt(qty)) ? 0 : parseInt(qty, 10);
                }
            });
        } else {
            const defaultQty = productFormStock.default;
            stockToSave.default = defaultQty === '' || isNaN(parseInt(defaultQty)) ? 0 : parseInt(defaultQty, 10);
        }

        const productData = {
            name: productForm.name,
            description: productForm.description,
            price: parseFloat(productForm.price),
            images: finalImages,
            sizes: productForm.has_sizes ? sizesArray : [],
            is_customizable: productForm.is_customizable,
            custom_text_label: productForm.is_customizable ? productForm.custom_text_label : null,
            category_ids: productForm.category_ids || [],
            stock: productForm.has_sizes ? stockToSave : (stockToSave.default || 0),
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

        const finalProduct: Product = { ...savedProduct, category_ids: savedProduct.category_ids || [], stock: getProductStock(savedProduct), images: savedProduct.images || [] };

        const newProducts = editingProduct
            ? products.map(p => p.id === finalProduct.id ? finalProduct : p)
            : [...products, finalProduct];
        
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
                return; 
            }

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
            if (!window.confirm('Tem certeza que deseja excluir este produto?')) {
                return;
            }
        }

        setDeletingItemId(`prod-${productId}`);
        try {
            if (productToDelete.images?.length > 0) {
                const imagePaths = productToDelete.images.map(img => {
                    try {
                        return new URL(img.url).pathname.split('/product-images/')[1];
                    } catch (e) {
                        console.warn('URL de imagem inválida, pulando exclusão:', img.url);
                        return null;
                    }
                }).filter(Boolean) as string[];

                if (imagePaths.length > 0) {
                     await supabase.storage.from('product-images').remove(imagePaths);
                }
            }

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
            const filePath = `public/kit-${Date.now()}-${sanitizeFileName(file.name)}`;
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
            discount_percentage: parseFloat(kitForm.discount_percentage) || 0,
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
                    discount_percentage: updatedKit.discount_percentage || 0,
                };
                const newKits = kits.map(k => k.id === updatedKit.id ? updatedKitWithProducts : k);
                setKits(newKits);
                onDataChange(products, categories, newKits, highlights);
                resetKitForm();
            }
        } else {
             const { data: countData, error: countError } = await supabase.from('kits').select('count', { count: 'exact' });
            if (countError) { alert('Erro ao contar kits: ' + countError.message); setIsSubmitting(false); return; }
            const kitCount = countData?.[0]?.count || 0;

            const kitDataWithOrder = { ...kitData, sort_order: kitCount };

            const { data: addedKit, error } = await supabase.from('kits').insert(kitDataWithOrder).select().single();
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
                    discount_percentage: addedKit.discount_percentage || 0,
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
    
    const handleStockChange = (productId: number, value: string, size: string = 'default') => {
        if (/^\d*$/.test(value)) {
            setStockLevels(prev => {
                const newLevels = { ...prev };
                newLevels[productId] = { ...(newLevels[productId] || {}), [size]: value };
                return newLevels;
            });
    
            const initialStockForProduct = getProductStock(initialProducts.find(p => p.id === productId));
            const currentStockWithStrings = { ...(stockLevels[productId] || {}), [size]: value };
            const numericStockObject = Object.fromEntries(
                Object.entries(currentStockWithStrings).map(([k, v]) => [k, Number(v) || 0])
            );
    
            const hasChanged = JSON.stringify(numericStockObject) !== JSON.stringify(initialStockForProduct);
    
            if (hasChanged) {
                setStockChanges(prev => ({
                    ...prev,
                    [productId]: numericStockObject,
                }));
            } else {
                setStockChanges(prev => {
                    const newChanges = { ...prev };
                    delete newChanges[productId];
                    return newChanges;
                });
            }
        }
    };

    const handleBulkUpdateStock = async () => {
        const changesCount = Object.keys(stockChanges).length;
        if (changesCount === 0) {
            alert("Nenhuma alteração de estoque para salvar.");
            return;
        }
    
        setIsSubmitting(true);
        const errors: string[] = [];
        const successfulUpdates: { [key: number]: { [key: string]: number } } = {};
    
        for (const [productIdStr, stockObject] of Object.entries(stockChanges)) {
            const productId = parseInt(productIdStr, 10);
            const product = products.find(p => p.id === productId);
            
            const hasSizes = product && product.sizes && product.sizes.length > 0;
            // If the product has sizes, send the object. If not, send the number.
            const payload = {
                stock: hasSizes ? stockObject : (stockObject['default'] || 0)
            };
    
            const { error } = await supabase
                .from('products')
                .update(payload)
                .eq('id', productId);
    
            if (error) {
                const productName = product ? product.name : `ID ${productId}`;
                errors.push(`- ${productName}: ${error.message}`);
            } else {
                // We still use the full stock object to update the local state correctly
                successfulUpdates[productId] = stockObject;
            }
        }
        
        setIsSubmitting(false);
    
        const successfulCount = Object.keys(successfulUpdates).length;
        if (successfulCount > 0) {
            const newProducts = products.map(p => {
                if (successfulUpdates[p.id]) {
                    return { ...p, stock: successfulUpdates[p.id] };
                }
                return p;
            });
            setProducts(newProducts);
            onDataChange(newProducts, categories, kits, highlights);
            
            // Clear only the successful changes from the changes list
            const remainingChanges = { ...stockChanges };
            for (const id in successfulUpdates) {
                delete remainingChanges[id];
            }
            setStockChanges(remainingChanges);
        }
        
        if (errors.length > 0) {
            const errorHint = 'O erro "invalid input syntax for type integer" geralmente indica uma incompatibilidade entre o aplicativo e o banco de dados. A coluna "stock" provavelmente espera um número único, mas o aplicativo está enviando um objeto para gerenciar o estoque por tamanho. Para corrigir isso, a coluna "stock" na sua tabela "products" no Supabase precisa ser alterada para o tipo JSONB.';
            alert(`Falha ao salvar ${errors.length} de ${changesCount} alterações.\n\nErros:\n${errors.join('\n')}\n\n${errorHint}`);
        } else {
            alert(`${changesCount} produto(s) atualizado(s) com sucesso!`);
        }
    };
    
    const handleHighlightFormChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            const file = files[0];
            if (file) {
                setHighlightImageFile(file);
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const imageAspectRatio = img.width / img.height;
                        const containerAspectRatio = 16 / 7;
                        const coverZoom = Math.max(1, containerAspectRatio / imageAspectRatio);
                        setHighlightForm(prev => ({ ...prev, zoom: coverZoom, pos_x: 0.5, pos_y: 0.5 }));
                    };
                    img.src = event.target?.result as string;
                };
                reader.readAsDataURL(file);
                setHighlightImagePreview(URL.createObjectURL(file));
            }
        } else {
            setHighlightForm(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleHighlightSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const highlightData: Partial<Highlight> = {
            type: highlightForm.type,
            title: highlightForm.title,
            subtitle: highlightForm.subtitle,
            zoom: highlightForm.zoom,
            pos_x: highlightForm.pos_x,
            pos_y: highlightForm.pos_y,
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
                const filePath = `highlights/${Date.now()}-${sanitizeFileName(file.name)}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
                if (uploadError) {
                    alert('Erro no upload: ' + uploadError.message);
                    setIsSubmitting(false); return;
                }
                const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
                highlightData.image_url = data.publicUrl;
            } else if (editingHighlight?.image_url) {
                highlightData.image_url = editingHighlight.image_url;
            } else {
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
        } else {
             onDataChange(products, categories, kits, orderedHighlights);
        }
    };
    
    const handleSaveItemOrder = async () => {
        if (itemOrderingCategoryId === null || itemOrderingCategoryId === 1) return;
        setIsSubmitting(true);
        const newItemOrder = orderedItems.map(item => ({ type: item.type, id: item.data.id }));
        const { error } = await supabase
            .from('categories')
            .update({ item_order: newItemOrder })
            .eq('id', itemOrderingCategoryId);
        
        if (error) {
            alert('Erro ao salvar a ordem dos itens: ' + error.message);
        } else {
            alert('Ordem salva com sucesso!');
            const newCategories = categories.map(c => 
                c.id === itemOrderingCategoryId ? { ...c, item_order: newItemOrder } : c
            );
            setCategories(newCategories);
            onDataChange(products, newCategories, kits, highlights);
            setInitialItemOrder(newItemOrder);
        }
        setIsSubmitting(false);
    };
    
    // --- Category Drag and Drop ---
    const handleCategoryDragStart = (e: React.DragEvent<HTMLElement>, categoryId: number) => {
        e.dataTransfer.setData('text/plain', categoryId.toString());
        e.dataTransfer.effectAllowed = 'move';
        setDraggedCategoryId(categoryId);
    };

    const handleCategoryDragOver = (e: React.DragEvent<HTMLElement>, targetId: string) => {
        e.preventDefault();
        setDragOverTarget(targetId);
    };

    const handleCategoryDrop = async (e: React.DragEvent<HTMLElement>, newParentId: number | null) => {
        e.preventDefault();
        if (draggedCategoryId === null) return;

        const isDescendant = (childId: number, parentId: number | null): boolean => {
            if (childId === parentId) return true;
            const child = categories.find(c => c.id === childId);
            if (!child || !child.parent_id) return false;
            return isDescendant(child.parent_id, parentId);
        };

        if (draggedCategoryId === newParentId || isDescendant(newParentId!, draggedCategoryId)) {
             handleDragEnd();
            return;
        }

        setIsSubmitting(true);
        const { error } = await supabase.from('categories').update({ parent_id: newParentId }).eq('id', draggedCategoryId);
        if (error) {
            alert('Erro ao reorganizar categoria: ' + error.message);
        } else {
            const newCategories = categories.map(c => c.id === draggedCategoryId ? { ...c, parent_id: newParentId } : c);
            setCategories(newCategories);
            onDataChange(products, newCategories, kits, highlights);
        }
        setIsSubmitting(false);
        handleDragEnd();
    };
    
    // --- Reusable Image Editor Component ---
    const ImageCropEditorModal = ({ image, onSave, onCancel, aspectRatio = '1 / 1' }: { image: ProductImage; onSave: (data: Partial<ProductImage>) => void; onCancel: () => void; aspectRatio?: string; }) => {
        const [zoom, setZoom] = useState(image.zoom);
        const [posX, setPosX] = useState(image.pos_x);
        const [posY, setPosY] = useState(image.pos_y);

        const editorRef = useRef<HTMLDivElement>(null);
        const isDraggingRef = useRef(false);
        const dragStartPosRef = useRef({ x: 0, y: 0, initialPosX: 0.5, initialPosY: 0.5 });

        const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
            e.preventDefault();
            isDraggingRef.current = true;
            dragStartPosRef.current = { x: e.clientX, y: e.clientY, initialPosX: posX, initialPosY: posY };
        };

        const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
            if (!isDraggingRef.current || !editorRef.current) return;
            e.preventDefault();

            const containerRect = editorRef.current.getBoundingClientRect();
            const deltaX = e.clientX - dragStartPosRef.current.x;
            const deltaY = e.clientY - dragStartPosRef.current.y;

            const moveFactorX = deltaX / (containerRect.width * Math.max(1, zoom - 1));
            const moveFactorY = deltaY / (containerRect.height * Math.max(1, zoom - 1));
            
            const newPosX = Math.max(0, Math.min(1, dragStartPosRef.current.initialPosX - moveFactorX));
            const newPosY = Math.max(0, Math.min(1, dragStartPosRef.current.initialPosY - moveFactorY));
            
            setPosX(newPosX);
            setPosY(newPosY);
        };

        const handleMouseUpOrLeave = () => {
            isDraggingRef.current = false;
        };

        return (
            <div className="modal-overlay">
                <div className="modal-content image-editor-modal" onClick={e => e.stopPropagation()}>
                     <button className="modal-close-button" onClick={onCancel}>&times;</button>
                     <h3>Editar Enquadramento da Imagem</h3>
                     <div className="highlight-preview-container">
                        <div
                            className="highlight-preview-editor"
                            ref={editorRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                            style={{ 
                                cursor: isDraggingRef.current ? 'grabbing' : 'grab',
                                aspectRatio: aspectRatio
                            }}
                        >
                            <div
                                className="highlight-preview-image"
                                style={{
                                    backgroundImage: `url(${image.url})`,
                                    backgroundSize: `${zoom * 100}%`,
                                    backgroundPosition: `${posX * 100}% ${posY * 100}%`,
                                }}
                            />
                        </div>
                        <div className="zoom-control">
                            <label htmlFor="zoom-slider-modal">Zoom</label>
                            <input
                                id="zoom-slider-modal"
                                type="range"
                                min="0.1"
                                max="10"
                                step="0.01"
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                            />
                        </div>
                     </div>
                     <div className="admin-form-actions">
                        <button className="admin-button" onClick={() => onSave({ zoom, pos_x: posX, pos_y: posY })}>Salvar</button>
                        <button className="admin-button cancel" onClick={onCancel}>Cancelar</button>
                     </div>
                </div>
            </div>
        );
    };

    const categoriesWithoutAll = categories.filter(c => c.id !== 1);

    const renderMenu = () => (
        <div className="admin-menu">
            <button className="admin-button" onClick={() => setActiveView('products')}>Gerenciar Produtos</button>
            <button className="admin-button" onClick={() => setActiveView('categories')}>Gerenciar Categorias</button>
            <button className="admin-button" onClick={() => setActiveView('kits')}>Gerenciar Kits</button>
            <button className="admin-button" onClick={() => setActiveView('stock')}>Gerenciar Estoque</button>
            <button className="admin-button" onClick={() => setActiveView('highlights')}>Gerenciar Destaques</button>
            <button className="admin-button" onClick={() => setActiveView('itemOrdering')}>Ordenar Itens da Loja</button>
        </div>
    );
    
    const renderProductsView = () => {
        const filteredAdminProducts = products.filter(p => 
            p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
        );
    
        return (
             <div className="admin-view">
                {editingProductImage && (
                    <ImageCropEditorModal 
                        image={editingProductImage.data}
                        aspectRatio="1 / 1"
                        onCancel={() => setEditingProductImage(null)}
                        onSave={(newCrop) => {
                            setImagePreviewObjects(current => 
                                current.map((img, index) => 
                                    index === editingProductImage.index ? { ...img, ...newCrop } : img
                                )
                            );
                            setEditingProductImage(null);
                        }}
                    />
                )}
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
                                <label htmlFor="productImages">Imagens do Produto (clique para selecionar, arraste para reordenar)</label>
                                <input type="file" id="productImages" multiple accept="image/*" onChange={(e) => handleImageSelect(e, false)} />
                            </div>
                            <div className="image-previews">
                                {imagePreviewObjects.map((imgObj, index) => {
                                    const isSelected = selectedItems.product_images.has(index);
                                    const isDraggingSource = draggingSourceIds.has(index);
                                    return (
                                        <div 
                                            key={imgObj.url + index} 
                                            className={`image-preview-item ${draggedItem?.list === 'product_images' && draggedItem.index === index ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${isDraggingSource ? 'dragging-source' : ''}`}
                                            draggable
                                            onClick={(e) => {
                                                if ((e.target as HTMLElement).closest('button')) return;
                                                handleSelection('product_images', index);
                                            }}
                                            onDragStart={(e) => handleDragStart(e, index, 'product_images', index)}
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop(index, 'product_images')}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <span className="image-order-badge">{index + 1}</span>
                                            <FramedImage image={imgObj} className="preview-framed-image" altText={`Preview ${index + 1}`} />
                                            <div className="image-preview-actions">
                                                <button type="button" className="edit-crop-button" onClick={() => setEditingProductImage({index, data: imgObj})}>Editar</button>
                                                <button type="button" className="remove-image-button" onClick={() => removeImage(index, false)} aria-label="Remover imagem">&times;</button>
                                            </div>
                                        </div>
                                    );
                                })}
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
                            
                            <div className="form-group">
                                <label>{productForm.has_sizes ? 'Estoque por Tamanho' : 'Estoque'}</label>
                                {productForm.has_sizes ? (
                                    <div className="size-stock-list">
                                        {(productForm.sizes.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)).map(size => (
                                            <div key={size} className="size-stock-item form-stock-item">
                                                <label htmlFor={`stock-form-${size}`}>Tamanho {size}</label>
                                                <input
                                                    id={`stock-form-${size}`}
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={productFormStock[size] || ''}
                                                    onChange={(e) => setProductFormStock(prev => ({ ...prev, [size]: e.target.value }))}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={productFormStock.default || ''}
                                        onChange={(e) => setProductFormStock({ default: e.target.value })}
                                    />
                                )}
                            </div>
    
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
                            <div className="form-group">
                                <input
                                    type="text"
                                    placeholder="Buscar produtos..."
                                    value={productSearchQuery}
                                    onChange={(e) => setProductSearchQuery(e.target.value)}
                                />
                            </div>
                            {filteredAdminProducts.length === 0 ? (
                                <p className="empty-list-message">Nenhum produto encontrado.</p>
                            ) : (
                                <ul className="item-list product-list">
                                    {filteredAdminProducts.map(product => {
                                        const imageObject = product.images?.[0];
                                        return (
                                            <li key={product.id}>
                                                <FramedImage image={imageObject} className="item-list-img" altText={product.name} />
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
    };
    
    const renderCategoriesView = () => {
        const renderCategoryTree = (parentId: number | null = null, level = 0) => {
            const children = categoriesWithoutAll
                .filter(c => c.parent_id === parentId);
        
            return children.map((cat, index) => {
                const isLastChild = index === children.length - 1;
                return (
                    <React.Fragment key={cat.id}>
                        <li 
                             className={`category-tree-item ${dragOverTarget === `cat-${cat.id}` ? 'drag-over-target' : ''} ${draggedCategoryId === cat.id ? 'dragging' : ''}`}
                             style={{ '--level': level } as React.CSSProperties}
                             draggable
                             onDragStart={(e) => handleCategoryDragStart(e, cat.id)}
                             onDragOver={(e) => handleCategoryDragOver(e, `cat-${cat.id}`)}
                             onDragLeave={() => setDragOverTarget(null)}
                             onDrop={(e) => handleCategoryDrop(e, cat.id)}
                             onDragEnd={handleDragEnd}
                        >
                            {level > 0 && <span className="tree-connector">{isLastChild ? '└─' : '├─'}</span>}
                            <span className="drag-handle">::</span>
                            {editingCategory?.id === cat.id ? (
                                <form onSubmit={handleUpdateCategory} className="category-edit-form">
                                    <input type="text" value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} autoFocus />
                                    <select value={editingCategoryParent} onChange={(e) => setEditingCategoryParent(e.target.value)}>
                                        <option value="">Nenhuma (Categoria Principal)</option>
                                        {categoriesWithoutAll
                                            .filter(p => p.id !== cat.id)
                                            .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <button type="submit" disabled={isSubmitting}>Salvar</button>
                                    <button type="button" onClick={() => setEditingCategory(null)}>Cancelar</button>
                                </form>
                            ) : (
                                <>
                                    <span className="item-list-name">{cat.name}</span>
                                    <div className="item-list-actions">
                                        <button onClick={() => handleStartEditCategory(cat)} className="item-list-edit-button">Editar</button>
                                        <button 
                                            onClick={() => handleDeleteCategory(cat)} 
                                            className="item-list-delete-button" 
                                            disabled={deletingItemId === `cat-${cat.id}`} 
                                            aria-label={`Excluir categoria ${cat.name}`}
                                        >
                                            {deletingItemId === `cat-${cat.id}` ? '...' : 'Excluir'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </li>
                        {renderCategoryTree(cat.id, level + 1)}
                    </React.Fragment>
                );
            });
        };

        return (
            <div className="admin-view">
                 {deleteConfirmation && (
                    <div className="modal-overlay">
                        <div className="modal-content category-delete-modal">
                            <h3>Excluir Categoria e Mover Produtos</h3>
                            <p>
                                A categoria <strong>"{deleteConfirmation.category.name}"</strong> (e suas subcategorias) contém 
                                <strong> {deleteConfirmation.productsInvolved.length} produto(s)</strong>.
                            </p>
                            <p>O que você gostaria de fazer com esses produtos?</p>
                            <div className="form-group">
                                <label htmlFor="move-product-select">Escolha uma ação:</label>
                                <select 
                                    id="move-product-select"
                                    value={deleteConfirmation.targetCategoryId}
                                    onChange={(e) => setDeleteConfirmation(prev => prev ? {...prev, targetCategoryId: e.target.value} : null)}
                                >
                                    <option value="desassociate">Apenas desassociar desta categoria</option>
                                    <optgroup label="Mover para...">
                                        {categoriesWithoutAll
                                            .filter(c => !deleteConfirmation.allDescendantIds.includes(c.id))
                                            .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                             <div className="admin-form-actions">
                                <button 
                                    className="admin-button danger" 
                                    onClick={handleConfirmDeleteCategory}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Excluindo...' : `Confirmar e Excluir Categoria`}
                                </button>
                                <button className="admin-button cancel" onClick={() => setDeleteConfirmation(null)}>Cancelar</button>
                             </div>
                        </div>
                    </div>
                )}
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
                            <div className="form-group">
                                <label htmlFor="parentId">Categoria Pai (opcional)</label>
                                <select id="parentId" name="parentId">
                                    <option value="">Nenhuma</option>
                                    {categoriesWithoutAll.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="admin-button" disabled={isSubmitting}>
                                {isSubmitting ? 'Adicionando...' : 'Adicionar Categoria'}
                            </button>
                        </form>
                    </section>
                    <section className="admin-section">
                        <h3>Categorias Existentes</h3>
                        <p>Arraste para reorganizar.</p>
                        {categoriesWithoutAll.length === 0 ? (
                            <p className="empty-list-message">Nenhuma categoria cadastrada.</p>
                        ) : (
                             <ul className="item-list category-tree">
                                <div 
                                    className={`top-level-drop-zone ${dragOverTarget === 'top-level' ? 'drag-over-target' : ''}`}
                                    onDragOver={(e) => handleCategoryDragOver(e, 'top-level')}
                                    onDragLeave={() => setDragOverTarget(null)}
                                    onDrop={(e) => handleCategoryDrop(e, null)}
                                >
                                    Solte aqui para ser uma Categoria Principal
                                </div>
                                {renderCategoryTree()}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        );
    };

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
                        <div className="form-group-inline">
                            <div className="form-group"><label htmlFor="kitPrice">Preço do Kit</label><input type="number" id="kitPrice" name="price" value={kitForm.price} onChange={handleKitFormChange} step="0.01" required placeholder="Soma automática" /></div>
                            <div className="form-group"><label htmlFor="kitDiscount">Desconto (%)</label><input type="number" id="kitDiscount" name="discount_percentage" value={kitForm.discount_percentage} onChange={handleKitFormChange} min="0" max="100" step="1" placeholder="ex: 10" /></div>
                        </div>
                        
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
                            <label htmlFor="kitImage">Imagens do Kit (clique para selecionar, arraste para reordenar)</label>
                            <input type="file" id="kitImage" multiple accept="image/*" onChange={(e) => handleImageSelect(e, true)} />
                        </div>
                        <div className="image-previews">
                           {kitImagePreviews.map((src, index) => {
                                const isSelected = selectedItems.kit_images.has(index);
                                const isDraggingSource = draggingSourceIds.has(index);
                                return (
                                    <div
                                        key={src + index}
                                        className={`image-preview-item ${draggedItem?.list === 'kit_images' && draggedItem.index === index ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${isDraggingSource ? 'dragging-source' : ''}`}
                                        draggable
                                        onClick={() => handleSelection('kit_images', index)}
                                        onDragStart={(e) => handleDragStart(e, index, 'kit_images', index)}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop(index, 'kit_images')}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <span className="image-order-badge">{index + 1}</span>
                                        <img src={src} alt={`Preview ${index + 1}`} />
                                        <div className="image-preview-actions">
                                            <button type="button" className="remove-image-button" onClick={() => removeImage(index, true)} aria-label="Remover imagem">&times;</button>
                                        </div>
                                    </div>
                                );
                            })}
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
                                    const imageObject = (p.images && p.images.length > 0) ? p.images[0] : null;
                                    return (
                                        <div 
                                            key={p.id} 
                                            className={`product-selection-item ${selectedKitProducts.has(p.id) ? 'selected' : ''}`}
                                            onClick={() => handleKitProductToggle(p.id)}
                                        >
                                            <FramedImage image={imageObject} className="product-selection-image" altText={p.name} />
                                            <span>{p.name}</span>
                                        </div>
                                    )
                                }) : <p className="empty-list-message">Nenhum produto encontrado.</p>}
                            </div>
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
                <div className="admin-section-header">
                    <h3>Gerenciar Estoque</h3>
                    <button
                        className="admin-button"
                        onClick={handleBulkUpdateStock}
                        disabled={Object.keys(stockChanges).length === 0 || isSubmitting}
                    >
                        {isSubmitting ? 'Salvando...' : `Salvar ${Object.keys(stockChanges).length} Alterações`}
                    </button>
                </div>
                <p>Atualize a quantidade de cada produto em seu inventário.</p>
                {products.length === 0 ? (
                    <p className="empty-list-message">Nenhum produto cadastrado para gerenciar o estoque.</p>
                ) : (
                    <ul className="item-list stock-list">
                        {products.map(product => {
                            const imageObject = (product.images && product.images.length > 0) ? product.images[0] : null;
                            const hasSizes = product.sizes && product.sizes.length > 0;
                            const currentStock = stockLevels[product.id] || {};
                            return (
                                <li key={product.id} className="stock-list-item">
                                    <FramedImage image={imageObject} className="item-list-img" altText={product.name} />
                                    <div className="item-list-details">
                                        <span className="item-list-name">{product.name}</span>
                                        {hasSizes ? (
                                            <div className="size-stock-list">
                                                {product.sizes.map(size => (
                                                    <div key={size} className="size-stock-item">
                                                        <label htmlFor={`stock-${product.id}-${size}`}>Tamanho {size}:</label>
                                                        <input
                                                            id={`stock-${product.id}-${size}`}
                                                            type="text"
                                                            inputMode="numeric" pattern="\d*"
                                                            value={currentStock[size] ?? ''}
                                                            onChange={(e) => handleStockChange(product.id, e.target.value, size)}
                                                            className="stock-input"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="stock-controls">
                                                <label htmlFor={`stock-${product.id}`}>Estoque:</label>
                                                <input
                                                    id={`stock-${product.id}`}
                                                    type="text"
                                                    inputMode="numeric" pattern="\d*"
                                                    value={currentStock.default ?? ''}
                                                    onChange={(e) => handleStockChange(product.id, e.target.value, 'default')}
                                                    className="stock-input"
                                                />
                                            </div>
                                        )}
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
                    image: product?.images?.[0] ?? null,
                    title: product?.name || 'Produto não encontrado',
                    subtitle: `Produto - R$ ${product?.price.toFixed(2).replace('.',',') || 'N/A'}`
                };
            } else {
                 return {
                    image: { url: highlight.image_url || '', zoom: highlight.zoom, pos_x: highlight.pos_x, pos_y: highlight.pos_y },
                    title: highlight.title || 'Imagem Personalizada',
                    subtitle: highlight.subtitle || ''
                };
            }
        };

        return (
            <div className="admin-view">
                 {isHighlightEditorOpen && highlightImagePreview && (
                     <ImageCropEditorModal 
                        image={{ url: highlightImagePreview, zoom: highlightForm.zoom, pos_x: highlightForm.pos_x, pos_y: highlightForm.pos_y }}
                        aspectRatio="16 / 7"
                        onCancel={() => setIsHighlightEditorOpen(false)}
                        onSave={(newCrop) => {
                            setHighlightForm(prev => ({...prev, ...newCrop}));
                            setIsHighlightEditorOpen(false);
                        }}
                     />
                 )}
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
                                        <label htmlFor="title">Título (opcional)</label>
                                        <input type="text" id="title" name="title" value={highlightForm.title} onChange={handleHighlightFormChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="subtitle">Subtítulo (opcional)</label>
                                        <input type="text" id="subtitle" name="subtitle" value={highlightForm.subtitle} onChange={handleHighlightFormChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="highlightImage">Imagem</label>
                                        <input type="file" id="highlightImage" name="image" accept="image/*" onChange={handleHighlightFormChange} />
                                    </div>

                                    {highlightImagePreview && (
                                        <div className="highlight-preview-container admin-form-preview">
                                            <h4>Pré-visualização do Enquadramento</h4>
                                            <button
                                                type="button"
                                                className="highlight-preview-interactive-wrapper"
                                                onClick={() => setIsHighlightEditorOpen(true)}
                                            >
                                                <div
                                                    className="highlight-preview-editor"
                                                    style={{
                                                        backgroundImage: `url(${highlightImagePreview})`,
                                                        backgroundSize: `${highlightForm.zoom * 100}%`,
                                                        backgroundPosition: `${highlightForm.pos_x * 100}% ${highlightForm.pos_y * 100}%`,
                                                    }}
                                                />
                                                <div className="preview-edit-overlay">
                                                    <span>Ajustar Enquadramento</span>
                                                </div>
                                            </button>
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
                        <p>Clique para selecionar, arraste para reordenar.</p>
                        {highlights.length === 0 ? (
                            <p className="empty-list-message">Nenhum destaque cadastrado.</p>
                        ) : (
                            <ul className="item-list highlights-admin-list">
                                {highlights.map((highlight, index) => {
                                    const { image, title, subtitle } = getHighlightDisplayInfo(highlight);
                                    const isSelected = selectedItems.highlights.has(highlight.id);
                                    const isDraggingSource = draggingSourceIds.has(highlight.id);
                                    return (
                                        <li 
                                            key={highlight.id}
                                            draggable
                                            className={`${draggedItem?.list === 'highlights' && draggedItem.index === index ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${isDraggingSource ? 'dragging-source' : ''}`}
                                            onClick={() => handleSelection('highlights', highlight.id)}
                                            onDragStart={(e) => handleDragStart(e, index, 'highlights', highlight.id)}
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop(index, 'highlights')}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <span className="drag-handle">::</span>
                                            <FramedImage image={image} className="item-list-img" altText={title} />
                                            <div className="item-list-details">
                                                <span className="item-list-name">{title}</span>
                                                <small>{subtitle}</small>
                                                <div className="item-list-actions">
                                                     <button onClick={() => setEditingHighlight(highlight)} className="item-list-edit-button">Editar</button>
                                                    <button onClick={() => handleDeleteHighlight(highlight.id)} className="item-list-delete-button" disabled={deletingItemId === `hl-${highlight.id}`}>
                                                        {deletingItemId === `hl-${highlight.id}` ? '...' : 'Excluir'}
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
        )
    };
    
    const renderItemOrderingView = () => {
        const isOrderChanged = JSON.stringify(orderedItems.map(item => ({ type: item.type, id: item.data.id }))) !== JSON.stringify(initialItemOrder);
        const canSaveOrder = itemOrderingCategoryId !== 1 && isOrderChanged && !isSubmitting;

        return (
            <div className="admin-view">
                <button onClick={() => setActiveView('menu')} className="admin-back-button">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                    Voltar ao Menu
                </button>
                <section className="admin-section">
                    <div className="admin-section-header">
                        <h3>Ordenar Itens da Loja por Categoria</h3>
                         {itemOrderingCategoryId && (
                             <button
                                className="admin-button"
                                onClick={handleSaveItemOrder}
                                disabled={!canSaveOrder}
                            >
                                {isSubmitting ? 'Salvando...' : 'Salvar Ordem'}
                            </button>
                         )}
                    </div>
                    <div className="form-group">
                        <label htmlFor="category-order-select">Selecione uma Categoria</label>
                        <select
                            id="category-order-select"
                            value={itemOrderingCategoryId || ''}
                            onChange={(e) => setItemOrderingCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                        >
                            <option value="">-- Escolha uma categoria --</option>
                            {[{ id: 1, name: 'Todos' }, ...categoriesWithoutAll].map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {itemOrderingCategoryId === 1 && (
                        <p className="admin-info-message">A ordenação da categoria "Todos" não pode ser salva. Esta visualização mostra todos os itens em ordem alfabética para referência.</p>
                    )}

                    {itemOrderingCategoryId && (
                         <div className="admin-section">
                            <h4>Itens em "{categories.find(c=>c.id === itemOrderingCategoryId)?.name || 'Todos'}"</h4>
                             <p>Clique para selecionar, arraste para reordenar.</p>
                            {orderedItems.length === 0 ? (
                                <p className="empty-list-message">Nenhum item nesta categoria.</p>
                            ) : (
                                <ul className={`item-list item-ordering-list ${itemOrderingCategoryId === 1 ? 'disabled-drag' : ''}`}>
                                    {orderedItems.map((item, index) => {
                                        const imageObject = item.type === 'product' ? item.data.images?.[0] : null;
                                        const kitImageUrl = item.type === 'kit' ? item.data.images?.[0] : null;
                                        const isKit = item.type === 'kit';
                                        const itemId = `${item.type}-${item.data.id}`;
                                        const isSelected = selectedItems.item_ordering.has(itemId);
                                        const isDraggingSource = draggingSourceIds.has(itemId);

                                        return (
                                            <li 
                                                key={itemId}
                                                draggable={itemOrderingCategoryId !== 1}
                                                className={`${draggedItem?.list === 'item_ordering' && draggedItem.index === index ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${isDraggingSource ? 'dragging-source' : ''}`}
                                                onClick={() => itemOrderingCategoryId !== 1 && handleSelection('item_ordering', itemId)}
                                                onDragStart={(e) => itemOrderingCategoryId !== 1 && handleDragStart(e, index, 'item_ordering', itemId)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => itemOrderingCategoryId !== 1 && handleDrop(index, 'item_ordering')}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <span className="drag-handle">::</span>
                                                 {isKit ? (
                                                    <img src={kitImageUrl || PLACEHOLDER_IMAGE} alt={item.data.name} className="item-list-img" />
                                                ) : (
                                                    <FramedImage image={imageObject} className="item-list-img" altText={item.data.name} />
                                                )}
                                                <div className="item-list-details">
                                                    <span className="item-list-name">{item.data.name} {isKit && '(Kit)'}</span>
                                                    <span className="item-list-price">R$ {item.data.price.toFixed(2).replace('.',',')}</span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}
                </section>
            </div>
        );
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
            {activeView === 'itemOrdering' && renderItemOrderingView()}
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
    const [activeParentCategory, setActiveParentCategory] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('default');
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
            
            const { data: kitsData, error: kitsError } = await supabase.from('kits').select('*').order('sort_order', { ascending: true, nullsFirst: false });
            if(kitsError) console.error('Erro ao buscar kits:', kitsError.message);
            
            const { data: highlightsData, error: highlightsError } = await supabase.from('highlights').select('*').order('sort_order', { ascending: true });
            if(highlightsError) console.error('Erro ao buscar destaques:', highlightsError.message);

            // Fetch association data for kits
            const { data: kitProductsData, error: kitProductsError } = await supabase.from('kit_products').select('*');
            if(kitProductsError) console.error('Erro ao buscar produtos dos kits:', kitProductsError.message);

            const localProducts: Product[] = (productsData || []).map(p => ({
                ...p,
                images: p.images || [],
                category_ids: p.category_ids || [], 
                stock: getProductStock(p),
            }));
            setProducts(localProducts);

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
                        discount_percentage: kit.discount_percentage || 0,
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
    const handleAddToCart = (item: DisplayItem, quantity: number, selectedSize?: string, customText?: string, kitConfigs?: KitProductConfiguration[], originalKitPrice?: number) => {
        setIsCartAnimating(true);
        setTimeout(() => setIsCartAnimating(false), 600);
    
        setCart(prevCart => {
            let cartItemId: string;
            let existingItem: CartItem | undefined;
    
            if (item.type === 'product') {
                const product = item.data as Product;
                const sizePart = product.sizes?.length > 0 ? selectedSize : 'no-size';
                const customPart = product.is_customizable ? customText?.trim() || '' : 'no-custom';
                cartItemId = `product-${product.id}-${sizePart}-${customPart}`;
                existingItem = prevCart.find(i => i.cartItemId === cartItemId);
            } else { // Kit
                const kit = item.data as Kit;
                // Generate a unique ID based on configurations, sorting keys for consistency
                const serializableConfigs = (kitConfigs || []).map(({ productId, size, customText, quantity }) => ({ productId, size, customText, quantity }));
                serializableConfigs.sort((a, b) => {
                    if (a.productId !== b.productId) return a.productId - b.productId;
                    if (a.size !== b.size) return (a.size || '').localeCompare(b.size || '');
                    if (a.customText !== b.customText) return (a.customText || '').localeCompare(b.customText || '');
                    return 0;
                });
                const configString = JSON.stringify(serializableConfigs);
                cartItemId = `kit-${kit.id}-${configString}`;
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
                } else { // Kit
                    const newItem: CartKitItem = {
                        type: 'kit',
                        data: item.data,
                        quantity,
                        cartItemId,
                        productConfigurations: kitConfigs || [],
                        originalPrice: originalKitPrice
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
                     const kitItem = item as CartKitItem;
                    let configDetails = '';
                    if (kitItem.productConfigurations) {
                         configDetails = (kitItem.data.products || []).map(product => {
                             const configs = kitItem.productConfigurations.filter(c => c.productId === product.id);
                             if (configs.length === 0) return '';
                             
                             const configLines = configs.map(config => {
                                 const details = [];
                                 if (config.size) details.push(`Tamanho: ${config.size}`);
                                 if (config.customText) details.push(`${product.custom_text_label || 'Personalização'}: "${config.customText}"`);
                                 if (Number(config.quantity) > 0) details.push(`Qtd: ${config.quantity}`);
                                 return `(${details.join(', ')})`;
                             }).join(', ');

                             return `\n    - ${product.name} ${configLines}`;
                         }).join('');
                    }

                     let priceDetails = `Preço por Kit: R$ ${kitItem.data.price.toFixed(2).replace('.', ',')}`;
                     if (kitItem.originalPrice && kitItem.originalPrice > kitItem.data.price) {
                         priceDetails += ` (de R$ ${kitItem.originalPrice.toFixed(2).replace('.', ',')})`;
                     }

                     return `*${item.data.name} (Kit)*${configDetails}\n` +
                           `  Quantidade de Kits: ${item.quantity}\n` +
                           `  ${priceDetails}`;
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
            setActiveParentCategory(null);
        }
    };
    
    const handleCategoryClick = (category: Category) => {
        setSearchQuery('');
        if (category.id === 1) { // Clicked "Todos"
            setSelectedCategory(1);
            setActiveParentCategory(null);
            return;
        }

        if (!category.parent_id) { // Clicked a top-level category
            if (activeParentCategory === category.id) { // Clicking the active parent again
                 setSelectedCategory(1); // Go back to "Todos"
                 setActiveParentCategory(null);
            } else {
                 setSelectedCategory(category.id);
                 setActiveParentCategory(category.id);
            }
        } else { // Clicked a subcategory
             setSelectedCategory(category.id);
             setActiveParentCategory(category.parent_id);
        }
    };


    // Renderização
    const displayItems = useMemo((): DisplayItem[] => {
        const productItems: DisplayItem[] = products.map(p => ({ type: 'product', data: p }));
        const kitItems: DisplayItem[] = kits.map(k => ({ type: 'kit', data: k }));
        return [...productItems, ...kitItems];
    }, [products, kits]);

    const filteredDisplayItems = useMemo(() => {
        const lowercasedQuery = searchQuery.trim().toLowerCase();

        if (lowercasedQuery) {
            return displayItems.filter(item =>
                item.data.name.toLowerCase().includes(lowercasedQuery) ||
                (item.data.description && item.data.description.toLowerCase().includes(lowercasedQuery))
            );
        }

        if (selectedCategory === 1) {
            return displayItems;
        }
        
        const getDescendantIds = (catId: number, allCats: Category[]): number[] => {
            const children = allCats.filter(c => c.parent_id === catId);
            let descendantIds: number[] = children.map(c => c.id);
            children.forEach(child => {
                descendantIds = [...descendantIds, ...getDescendantIds(child.id, allCats)];
            });
            return descendantIds;
        };
        
        const category = categories.find(c => c.id === selectedCategory);
        let categoryIdsToFilter = [selectedCategory];
        if (category && !category.parent_id) { // It's a parent category
            categoryIdsToFilter = [...categoryIdsToFilter, ...getDescendantIds(selectedCategory, categories)];
        }

        return displayItems.filter(item => (item.data.category_ids || []).some(id => categoryIdsToFilter.includes(id)));
    }, [displayItems, searchQuery, selectedCategory, categories]);

    const sortedDisplayItems = useMemo(() => {
        const sortableItems = [...filteredDisplayItems];
        
        if (sortOption === 'default' && selectedCategory !== 1) {
             const category = categories.find(c => c.id === selectedCategory);
             // Check for new item_order first
             if (category && category.item_order && category.item_order.length > 0) {
                const orderMap = new Map(category.item_order.map((item, index) => [`${item.type}-${item.id}`, index]));
                return sortableItems.sort((a, b) => {
                    const keyA = `${a.type}-${a.data.id}`;
                    const keyB = `${b.type}-${b.data.id}`;
                    const indexA = orderMap.get(keyA);
                    const indexB = orderMap.get(keyB);

                    if (indexA !== undefined && indexB !== undefined) return indexA - indexB;
                    if (indexA !== undefined) return -1;
                    if (indexB !== undefined) return 1;
                    // Items not in the custom order list get sorted by name at the end
                    return a.data.name.localeCompare(b.data.name);
                });
             }
             // Fallback to old product_order for backward compatibility
             if (category && category.product_order && category.product_order.length > 0) {
                const orderMap = new Map(category.product_order.map((id, index) => [id, index]));
                return sortableItems.sort((a, b) => {
                    const aIsProduct = a.type === 'product';
                    const bIsProduct = b.type === 'product';
                    if (!aIsProduct || !bIsProduct) return 0; // Don't sort kits this way

                    const indexA = orderMap.get((a.data as Product).id);
                    const indexB = orderMap.get((b.data as Product).id);

                    if (indexA !== undefined && indexB !== undefined) return indexA - indexB;
                    if (indexA !== undefined) return -1;
                    if (indexB !== undefined) return 1;
                    return a.data.name.localeCompare(b.data.name);
                });
             }
        }
        
        switch (sortOption) {
            case 'price-asc':
                return sortableItems.sort((a, b) => a.data.price - b.data.price);
            case 'price-desc':
                return sortableItems.sort((a, b) => b.data.price - a.data.price);
            case 'name-asc':
                return sortableItems.sort((a, b) => a.data.name.localeCompare(b.data.name));
            case 'name-desc':
                return sortableItems.sort((a, b) => b.data.name.localeCompare(a.data.name));
            default:
                 // For "Todos" or categories without custom order, sort alphabetically
                 return sortableItems.sort((a, b) => a.data.name.localeCompare(b.data.name));
        }
    }, [filteredDisplayItems, sortOption, selectedCategory, categories]);

    const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    
    if (currentView === 'adminLogin') {
        return <AdminLogin onLogin={handleAdminLogin} onBackToStore={navigateToStore} />;
    }
    
    if (currentView === 'adminDashboard') {
        return <AdminDashboard initialProducts={products} initialCategories={categories} initialKits={kits} initialHighlights={highlights} onDataChange={handleDataChange} onBackToStore={navigateToStore} />;
    }
    
    const topLevelCategories = categories.filter(c => c.id !== 1 && !c.parent_id);
    const subCategories = categories.filter(c => !!c.parent_id);

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
                <div className="main-controls-container">
                    <div className="category-filters">
                        <button
                            key="all"
                            className={`category-button ${selectedCategory === 1 ? 'active' : ''}`}
                            onClick={() => handleCategoryClick({ id: 1, name: 'Todos' })}
                        >
                            Todos
                        </button>
                        {topLevelCategories.map(cat => (
                             <React.Fragment key={cat.id}>
                                <button
                                    className={`category-button ${activeParentCategory === cat.id ? 'active-parent' : ''} ${selectedCategory === cat.id ? 'active' : ''}`}
                                    onClick={() => handleCategoryClick(cat)}
                                >
                                    {cat.name}
                                </button>
                             </React.Fragment>
                        ))}
                    </div>
                    <div className="sort-control">
                        <label htmlFor="sort-select" className="sr-only">Ordenar por</label>
                        <select
                            id="sort-select"
                            className="sort-select"
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            aria-label="Ordenar produtos"
                        >
                            <option value="default">Padrão</option>
                            <option value="price-asc">Menor Preço</option>
                            <option value="price-desc">Maior Preço</option>
                            <option value="name-asc">Nome (A-Z)</option>
                            <option value="name-desc">Nome (Z-A)</option>
                        </select>
                    </div>
                </div>
                 {activeParentCategory && (
                    <div className="subcategory-filters">
                         {subCategories.filter(sc => sc.parent_id === activeParentCategory).map(subCat => (
                             <button
                                key={subCat.id}
                                className={`category-button subcategory-button ${selectedCategory === subCat.id ? 'active' : ''}`}
                                onClick={() => handleCategoryClick(subCat)}
                            >
                                {subCat.name}
                            </button>
                         ))}
                    </div>
                )}

                {isLoading ? (
                    <div className="product-grid">
                        {Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)}
                    </div>
                ) : (
                    <div className="product-grid">
                        {sortedDisplayItems.length > 0 ? (
                            sortedDisplayItems.map(item => (
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