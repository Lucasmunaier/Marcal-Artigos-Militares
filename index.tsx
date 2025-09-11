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
    category_id: number | null;
    is_customizable: boolean;
    custom_text_label: string | null;
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
    image: string;
    products: Product[];
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

// --- COMPONENTES DA UI ---

const SkeletonCard = () => (
    <div className="skeleton-card">
        <div className="skeleton-image"></div>
        <div className="skeleton-text"></div>
        <div className="skeleton-text short"></div>
    </div>
);

const Header = ({ onCartClick, cartItemCount, onLogoClick, isCartAnimating }) => (
    <header>
        <div className="logo-container" onClick={onLogoClick} style={{cursor: 'pointer'}}>
            <img src="/icon.png" alt="Marçal Artigos Militares Logo" className="logo-icon" />
            <h1>Marçal Artigos Militares</h1>
        </div>
        <button className={`cart-button ${isCartAnimating ? 'bouncing' : ''}`} onClick={onCartClick} aria-label={`Ver carrinho com ${cartItemCount} itens`}>
            <svg className="cart-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.838-5.513A1.875 1.875 0 0 0 18.25 6H5.25L4.405 3.56A1.125 1.125 0 0 0 3.322 3H2.25zM7.5 18a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
            </svg>
            {cartItemCount > 0 && <span key={cartItemCount} className="cart-count">{cartItemCount}</span>}
        </button>
    </header>
);

const ProductCard = ({ item, onProductClick }: { item: DisplayItem, onProductClick: (item: DisplayItem) => void }) => (
    <div className="product-card" onClick={() => onProductClick(item)}>
        {item.type === 'kit' && <span className="item-badge">KIT</span>}
        <img src={item.type === 'product' ? item.data.images[0] : item.data.image} alt={item.data.name} />
        <div className="product-card-info">
            <h3>{item.data.name}</h3>
            <p className="price">R$ {item.data.price.toFixed(2).replace('.', ',')}</p>
        </div>
    </div>
);

const ProductDetailModal = ({ item, onClose, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState(item.type === 'product' ? item.data.sizes?.[0] || '' : '');
    const [customText, setCustomText] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleAddToCartClick = () => {
        if (item.type === 'product') {
            const product = item.data;
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
                    {kit.products.map(p => <li key={p.id}>{p.name}</li>)}
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
                        <img src={item.type === 'product' ? item.data.images[0] : item.data.image} alt={item.data.name} />
                    </div>
                    <div className="product-detail-info">
                        <h2>{item.data.name}</h2>
                        <p className="price">R$ {item.data.price.toFixed(2).replace('.', ',')}</p>
                        <p className="description">{item.data.description}</p>
                        {item.type === 'product' ? renderProductDetails() : renderKitDetails()}
                        <button 
                            className={`add-to-cart-button ${showSuccess ? 'success' : ''}`} 
                            onClick={handleAddToCartClick} 
                            disabled={showSuccess}
                        >
                            {showSuccess ? (
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
                        cart.map(item => (
                            <div key={item.cartItemId} className={`cart-item ${removingItems.includes(item.cartItemId) ? 'removing' : ''}`}>
                                <img src={item.type === 'product' ? item.data.images[0] : item.data.image} alt={item.data.name} />
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
                        ))
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

const AdminDashboard = ({ initialProducts, initialCategories, initialKits, onDataChange, onBackToStore }) => {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [kits, setKits] = useState<Kit[]>(initialKits);
    
    // Estados de Navegação
    const [activeView, setActiveView] = useState<'menu' | 'products' | 'categories' | 'kits'>('menu');

    // Estados de Edição
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingKit, setEditingKit] = useState<Kit | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');

    // Estados de Loading
    const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
    const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
    const [isSubmittingKit, setIsSubmittingKit] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
    
    // Formulário de produto
    const [productForm, setProductForm] = useState({ name: '', description: '', price: '', category_id: '', sizes: '', has_sizes: true, is_customizable: false, custom_text_label: 'Nome' });
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    
    // Formulário de Kit
    const [kitForm, setKitForm] = useState({ name: '', description: '', price: '' });
    const [kitImageFile, setKitImageFile] = useState<File | null>(null);
    const [kitImagePreview, setKitImagePreview] = useState<string | null>(null);
    const [selectedKitProducts, setSelectedKitProducts] = useState<Set<number>>(new Set());


    useEffect(() => {
        if (editingProduct) {
            setProductForm({
                name: editingProduct.name,
                description: editingProduct.description,
                price: editingProduct.price.toString(),
                category_id: editingProduct.category_id?.toString() || '',
                sizes: editingProduct.sizes.join(', '),
                has_sizes: editingProduct.sizes.length > 0,
                is_customizable: editingProduct.is_customizable,
                custom_text_label: editingProduct.custom_text_label || 'Nome',
            });
            setExistingImages(editingProduct.images);
            setImagePreviews(editingProduct.images);
            setImageFiles([]);
            setActiveView('products');
        } else {
            resetProductForm();
        }
    }, [editingProduct]);

    useEffect(() => {
        if (editingKit) {
            setKitForm({
                name: editingKit.name,
                description: editingKit.description,
                price: editingKit.price.toString(),
            });
            setKitImagePreview(editingKit.image);
            setSelectedKitProducts(new Set(editingKit.products.map(p => p.id)));
            setKitImageFile(null);
            setActiveView('kits');
        } else {
            resetKitForm();
        }
    }, [editingKit]);

    const resetProductForm = () => {
        setProductForm({ name: '', description: '', price: '', category_id: '', sizes: '', has_sizes: true, is_customizable: false, custom_text_label: 'Nome' });
        imagePreviews.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
        setImageFiles([]);
        setImagePreviews([]);
        setExistingImages([]);
        setEditingProduct(null);
    };

    const resetKitForm = () => {
        setKitForm({ name: '', description: '', price: '' });
        if (kitImagePreview && kitImagePreview.startsWith('blob:')) URL.revokeObjectURL(kitImagePreview);
        setKitImageFile(null);
        setKitImagePreview(null);
        setSelectedKitProducts(new Set());
        setEditingKit(null);
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

    const handleKitFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setKitForm(prev => ({ ...prev, [name]: value }));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImageFiles(prev => [...prev, ...files]);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };
    
    const handleKitImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setKitImageFile(file);
            if (kitImagePreview && kitImagePreview.startsWith('blob:')) URL.revokeObjectURL(kitImagePreview);
            setKitImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = (index: number, isExisting: boolean) => {
        const urlToRemove = imagePreviews[index];
        if (isExisting) {
            setExistingImages(prev => prev.filter(img => img !== urlToRemove));
        } else {
            const fileIndex = imagePreviews.slice(0, index).filter(p => !existingImages.includes(p)).length;
            setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
        }
        if (urlToRemove.startsWith('blob:')) URL.revokeObjectURL(urlToRemove);
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
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
            setIsSubmittingCategory(true);
            const { data: addedCategory, error } = await supabase.from('categories').insert({ name }).select().single();
            if (error) {
                alert('Erro ao adicionar categoria: ' + error.message);
            } else {
                const newCategories = [...categories, addedCategory];
                setCategories(newCategories);
                onDataChange(products, newCategories, kits);
                form.reset();
            }
            setIsSubmittingCategory(false);
        }
    };
    
    const handleDeleteCategory = async (categoryId: number) => {
        const isCategoryInUse = products.some(p => p.category_id === categoryId);
        if (isCategoryInUse) {
            alert('Não é possível excluir esta categoria, pois ela está sendo usada por um ou mais produtos.');
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
                onDataChange(products, newCategories, kits);
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

        setIsSubmittingCategory(true);
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
            onDataChange(products, newCategories, kits);
            setEditingCategory(null);
        }
        setIsSubmittingCategory(false);
    };

    const handleProductFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (imagePreviews.length === 0) {
            alert('Por favor, adicione pelo menos uma imagem para o produto.');
            return;
        }
        setIsSubmittingProduct(true);
        
        const uploadedImageUrls: string[] = [];
        for (const file of imageFiles) {
            const filePath = `public/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
            if (uploadError) {
                alert('Erro ao fazer upload da imagem: ' + uploadError.message);
                setIsSubmittingProduct(false); return;
            }
            const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
            uploadedImageUrls.push(data.publicUrl);
        }

        if (editingProduct) {
            const imagesToRemove = editingProduct.images.filter(img => !existingImages.includes(img));
            if (imagesToRemove.length > 0) {
                const imagePaths = imagesToRemove.map(url => new URL(url).pathname.split('/product-images/')[1]);
                await supabase.storage.from('product-images').remove(imagePaths);
            }
        }
        
        const finalImageUrls = [...existingImages, ...uploadedImageUrls];

        const productData = {
            name: productForm.name,
            description: productForm.description,
            price: parseFloat(productForm.price),
            images: finalImageUrls,
            sizes: productForm.has_sizes ? productForm.sizes.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [],
            category_id: productForm.category_id ? parseInt(productForm.category_id, 10) : null,
            is_customizable: productForm.is_customizable,
            custom_text_label: productForm.is_customizable ? productForm.custom_text_label : null,
        };

        if (editingProduct) {
            const { data: updatedProduct, error } = await supabase.from('products').update(productData).eq('id', editingProduct.id).select().single();
            if (error) {
                alert('Erro ao atualizar produto: ' + error.message);
            } else {
                const newProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
                setProducts(newProducts);
                onDataChange(newProducts, categories, kits);
                resetProductForm();
            }
        } else {
            const { data: addedProduct, error } = await supabase.from('products').insert(productData).select().single();
            if (error) {
                alert('Erro ao adicionar produto: ' + error.message);
            } else {
                const newProducts = [...products, addedProduct];
                setProducts(newProducts);
                onDataChange(newProducts, categories, kits);
                resetProductForm();
            }
        }
        setIsSubmittingProduct(false);
    };

    const handleDeleteProduct = async (productId: number) => {
        const productToDelete = products.find(p => p.id === productId);
        if (!productToDelete) return;
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            setDeletingItemId(`prod-${productId}`);
            if (productToDelete.images?.length > 0) {
                const imagePaths = productToDelete.images.map(url => new URL(url).pathname.split('/product-images/')[1]);
                await supabase.storage.from('product-images').remove(imagePaths);
            }
            const { error } = await supabase.from('products').delete().eq('id', productId);
            if (error) {
                alert('Erro ao excluir produto: ' + error.message);
            } else {
                const newProducts = products.filter(p => p.id !== productId);
                setProducts(newProducts);
                onDataChange(newProducts, categories, kits);
            }
            setDeletingItemId(null);
        }
    };

    const handleKitFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!kitImageFile && !editingKit?.image) {
            alert('Por favor, adicione uma imagem para o kit.');
            return;
        }
        setIsSubmittingKit(true);

        let imageUrl = editingKit?.image || '';
        if (kitImageFile) {
            if (editingKit?.image) { // Remove old image if a new one is uploaded
                const oldPath = new URL(editingKit.image).pathname.split('/product-images/')[1];
                await supabase.storage.from('product-images').remove([oldPath]);
            }
            const filePath = `public/kit-${Date.now()}-${kitImageFile.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, kitImageFile);
            if (uploadError) {
                alert('Erro ao fazer upload da imagem do kit: ' + uploadError.message);
                setIsSubmittingKit(false); return;
            }
            const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
            imageUrl = data.publicUrl;
        }

        const kitData = {
            name: kitForm.name,
            description: kitForm.description,
            price: parseFloat(kitForm.price),
            image: imageUrl,
        };

        const productAssociations = Array.from(selectedKitProducts);

        if (editingKit) {
            const { data: updatedKit, error } = await supabase.from('kits').update(kitData).eq('id', editingKit.id).select().single();
            if (error) { alert('Erro ao atualizar kit: ' + error.message); }
            else {
                await supabase.from('kit_products').delete().eq('kit_id', updatedKit.id);
                const kitProductInserts = productAssociations.map(pid => ({ kit_id: updatedKit.id, product_id: pid }));
                await supabase.from('kit_products').insert(kitProductInserts);

                const updatedKitWithProducts = { ...updatedKit, products: products.filter(p => productAssociations.includes(p.id))};
                const newKits = kits.map(k => k.id === updatedKit.id ? updatedKitWithProducts : k);
                setKits(newKits);
                onDataChange(products, categories, newKits);
                resetKitForm();
            }
        } else {
            const { data: addedKit, error } = await supabase.from('kits').insert(kitData).select().single();
            if (error) { alert('Erro ao adicionar kit: ' + error.message); }
            else {
                const kitProductInserts = productAssociations.map(pid => ({ kit_id: addedKit.id, product_id: pid }));
                await supabase.from('kit_products').insert(kitProductInserts);

                const addedKitWithProducts = { ...addedKit, products: products.filter(p => productAssociations.includes(p.id))};
                const newKits = [...kits, addedKitWithProducts];
                setKits(newKits);
                onDataChange(products, categories, newKits);
                resetKitForm();
            }
        }
        setIsSubmittingKit(false);
    };

    const handleDeleteKit = async (kitId: number) => {
        const kitToDelete = kits.find(k => k.id === kitId);
        if (!kitToDelete) return;

        if (window.confirm('Tem certeza que deseja excluir este kit?')) {
            setDeletingItemId(`kit-${kitId}`);
            if (kitToDelete.image) {
                const imagePath = new URL(kitToDelete.image).pathname.split('/product-images/')[1];
                await supabase.storage.from('product-images').remove([imagePath]);
            }

            const { error } = await supabase.from('kits').delete().eq('id', kitId);
            if (error) { alert('Erro ao excluir kit: ' + error.message); }
            else {
                const newKits = kits.filter(k => k.id !== kitId);
                setKits(newKits);
                onDataChange(products, categories, newKits);
            }
            setDeletingItemId(null);
        }
    };
    
    const categoriesWithoutAll = categories.filter(c => c.id !== 1);

    const renderMenu = () => (
        <div className="admin-menu">
            <button className="admin-button" onClick={() => setActiveView('products')}>Gerenciar Produtos</button>
            <button className="admin-button" onClick={() => setActiveView('categories')}>Gerenciar Categorias</button>
            <button className="admin-button" onClick={() => setActiveView('kits')}>Gerenciar Kits</button>
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
                        <div className="form-group"><label htmlFor="productDescription">Descrição</label><textarea id="productDescription" name="description" value={productForm.description} onChange={handleFormChange} required></textarea></div>
                        <div className="form-group"><label htmlFor="productPrice">Preço (ex: 99.90)</label><input type="number" id="productPrice" name="price" value={productForm.price} onChange={handleFormChange} step="0.01" required /></div>
                        
                        <div className="form-group">
                            <label htmlFor="productImages">Imagens do Produto</label>
                            <input type="file" id="productImages" multiple accept="image/*" onChange={handleImageSelect} />
                        </div>
                        <div className="image-previews">
                            {imagePreviews.map((src, index) => (
                                <div key={src + index} className="image-preview-item">
                                    <img src={src} alt={`Preview ${index + 1}`} />
                                    <button type="button" onClick={() => removeImage(index, existingImages.includes(src))} aria-label="Remover imagem">&times;</button>
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
                            <label htmlFor="productCategory">Categoria</label>
                            <select id="productCategory" name="category_id" value={productForm.category_id} onChange={handleFormChange}>
                                <option value="">Nenhuma Categoria</option>
                                {categoriesWithoutAll.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                        <div className="admin-form-actions">
                            <button type="submit" className="admin-button" disabled={isSubmittingProduct}>
                                {isSubmittingProduct ? 'Salvando...' : (editingProduct ? 'Salvar Alterações' : 'Adicionar Produto')}
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
                                {products.map(product => (
                                    <li key={product.id}>
                                        <img src={product.images[0]} alt={product.name} className="item-list-img" />
                                        <span>{product.name}</span>
                                        <span className="item-list-price">R$ {product.price.toFixed(2).replace('.',',')}</span>
                                        <div className="item-list-actions">
                                            <button onClick={() => setEditingProduct(product)} className="item-list-edit-button">Editar</button>
                                            <button onClick={() => handleDeleteProduct(product.id)} className="item-list-delete-button" disabled={deletingItemId === `prod-${product.id}`} aria-label={`Excluir produto ${product.name}`}>
                                                {deletingItemId === `prod-${product.id}` ? '...' : 'Excluir'}
                                            </button>
                                        </div>
                                    </li>
                                ))}
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
                        <button type="submit" className="admin-button" disabled={isSubmittingCategory}>
                            {isSubmittingCategory ? 'Adicionando...' : 'Adicionar Categoria'}
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
                                            <button type="submit" disabled={isSubmittingCategory}>Salvar</button>
                                            <button type="button" onClick={() => setEditingCategory(null)}>Cancelar</button>
                                        </form>
                                    ) : (
                                        <>
                                            <span>{cat.name}</span>
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

    const renderKitsView = () => (
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
                        <div className="form-group"><label htmlFor="kitDescription">Descrição</label><textarea id="kitDescription" name="description" value={kitForm.description} onChange={handleKitFormChange} required></textarea></div>
                        <div className="form-group"><label htmlFor="kitPrice">Preço do Kit</label><input type="number" id="kitPrice" name="price" value={kitForm.price} onChange={handleKitFormChange} step="0.01" required /></div>
                        
                        <div className="form-group">
                            <label htmlFor="kitImage">Imagem do Kit</label>
                            <input type="file" id="kitImage" accept="image/*" onChange={handleKitImageSelect} />
                        </div>
                        {kitImagePreview && (
                            <div className="image-previews">
                                <div className="image-preview-item">
                                    <img src={kitImagePreview} alt="Preview do Kit" />
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Produtos para incluir no Kit</label>
                            <div className="product-checklist">
                                {products.length > 0 ? products.map(p => (
                                    <div key={p.id} className="checklist-item">
                                        <input type="checkbox" id={`kit-prod-${p.id}`} checked={selectedKitProducts.has(p.id)} onChange={() => handleKitProductToggle(p.id)} />
                                        <label htmlFor={`kit-prod-${p.id}`}>{p.name}</label>
                                    </div>
                                )) : <p>Nenhum produto cadastrado para adicionar.</p>}
                            </div>
                        </div>

                        <div className="admin-form-actions">
                            <button type="submit" className="admin-button" disabled={isSubmittingKit}>
                                {isSubmittingKit ? 'Salvando...' : (editingKit ? 'Salvar Kit' : 'Criar Kit')}
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
                            {kits.map(kit => (
                                <li key={kit.id}>
                                    <img src={kit.image} alt={kit.name} className="item-list-img" />
                                    <span>{kit.name}</span>
                                    <span className="item-list-price">R$ {kit.price.toFixed(2).replace('.',',')}</span>
                                    <div className="item-list-actions">
                                        <button onClick={() => setEditingKit(kit)} className="item-list-edit-button">Editar</button>
                                        <button onClick={() => handleDeleteKit(kit.id)} className="item-list-delete-button" disabled={deletingItemId === `kit-${kit.id}`} aria-label={`Excluir kit ${kit.name}`}>
                                            {deletingItemId === `kit-${kit.id}` ? '...' : 'Excluir'}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );


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
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number>(1); // 1 = 'Todos'
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

            const { data: productsData, error: productsError } = await supabase.from('products').select('*');
            if (productsError) {
                console.error('Erro ao buscar produtos:', productsError.message);
            }
            const localProducts = productsData || [];
            setProducts(localProducts);

            const { data: categoriesData, error: categoriesError } = await supabase.from('categories').select('*');
            if (categoriesError) {
                console.error('Erro ao buscar categorias:', categoriesError.message);
            } else {
                setCategories([{ id: 1, name: 'Todos' }, ...(categoriesData || [])]);
            }
            
            const { data: kitsData, error: kitsError } = await supabase.from('kits').select('*');
            if(kitsError) { console.error('Erro ao buscar kits:', kitsError.message); }

            const { data: kitProductsData, error: kitProductsError } = await supabase.from('kit_products').select('*');
            if(kitProductsError) { console.error('Erro ao buscar produtos dos kits:', kitProductsError.message); }

            if (kitsData && localProducts && kitProductsData) {
                const kitsWithProducts: Kit[] = kitsData.map(kit => {
                    const productIds = kitProductsData.filter(kp => kp.kit_id === kit.id).map(kp => kp.product_id);
                    const kitProducts = localProducts.filter(p => productIds.includes(p.id));
                    return { ...kit, products: kitProducts };
                });
                setKits(kitsWithProducts);
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

    const handleDataChange = (newProducts, newCategories, newKits) => {
        setProducts(newProducts);
        const existingCategories = newCategories.filter(c => c.id !== 1);
        setCategories([{id: 1, name: 'Todos'}, ...existingCategories]);
        setKits(newKits);
    };

    const navigateToStore = () => {
        setCurrentView('store');
        setSelectedCategory(1);
    };
    
    const navigateToAdminLogin = () => {
        setCurrentView('adminLogin');
    };

    // Renderização
    const displayItems = useMemo((): DisplayItem[] => {
        const productItems: DisplayItem[] = products.map(p => ({ type: 'product', data: p }));
        const kitItems: DisplayItem[] = kits.map(k => ({ type: 'kit', data: k }));
        return [...productItems, ...kitItems].sort((a,b) => a.data.id - b.data.id);
    }, [products, kits]);

    const filteredDisplayItems = useMemo(() => {
        if (selectedCategory === 1) return displayItems;
        // Kits do not have categories, so they are only shown in "Todos"
        return displayItems.filter(item => item.type === 'product' && item.data.category_id === selectedCategory);
    }, [displayItems, selectedCategory]);

    const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    
    if (currentView === 'adminLogin') {
        return <AdminLogin onLogin={handleAdminLogin} onBackToStore={navigateToStore} />;
    }
    
    if (currentView === 'adminDashboard') {
        return <AdminDashboard initialProducts={products} initialCategories={categories} initialKits={kits} onDataChange={handleDataChange} onBackToStore={navigateToStore} />;
    }

    return (
        <>
            <Header onCartClick={() => setIsCartOpen(true)} cartItemCount={cartItemCount} onLogoClick={navigateToStore} isCartAnimating={isCartAnimating} />
            <main>
                <img src="/Principal.png" alt="Banner Marçal Artigos Militares" className="main-banner" />
                <div className="category-filters">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`category-button ${selectedCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat.id)}
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
                        {filteredDisplayItems.length > 0 ? filteredDisplayItems.map(item => (
                            <ProductCard key={`${item.type}-${item.data.id}`} item={item} onProductClick={setSelectedDisplayItem} />
                        )) : <p>Nenhum produto encontrado nesta categoria.</p>}
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