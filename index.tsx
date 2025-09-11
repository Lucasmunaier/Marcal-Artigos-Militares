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
    category_id: number;
    is_customizable: boolean;
    custom_text_label: string | null;
}

interface Category {
    id: number;
    name: string;
}

interface CartItem extends Product {
    quantity: number;
    selectedSize: string;
    customText?: string;
    cartItemId: string;
}

// --- CLIENTE SUPABASE REAL ---
const SUPABASE_URL = 'https://icqaffyqnwuetfnslcif.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcWFmZnlxbnd1ZXRmbnNsY2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MTI0MzEsImV4cCI6MjA3MzE4ODQzMX0.-ob_QS2esdbrBlgYL2rnXTPsVH5fYcWIUEbext1ILuM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CONFIGURAÇÕES ---
const ADMIN_PASSWORD = 'admin'; // Senha para o painel de administração
const WHATSAPP_NUMBER = '553196950157'; // Número do WhatsApp para receber os pedidos
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
            <img src="icon.png" alt="Marçal Artigos Militares Logo" className="logo-icon" />
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

const ProductCard = ({ product, onProductClick }: { product: Product, onProductClick: (product: Product) => void }) => (
    <div className="product-card" onClick={() => onProductClick(product)}>
        <img src={product.images[0]} alt={product.name} />
        <div className="product-card-info">
            <h3>{product.name}</h3>
            <p className="price">R$ {product.price.toFixed(2).replace('.', ',')}</p>
        </div>
    </div>
);

const ProductDetailModal = ({ product, onClose, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || '');
    const [customText, setCustomText] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleAddToCart = () => {
        if (product.is_customizable && !customText.trim()) {
            alert('Por favor, insira o texto para personalização.');
            return;
        }
        if (product.sizes?.length > 0 && !selectedSize) {
            alert('Por favor, selecione um tamanho.');
            return;
        }
        onAddToCart(product, quantity, selectedSize, customText);
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
        }, 1500);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>&times;</button>
                <div className="product-detail">
                    <div className="product-detail-images">
                        <img src={product.images[0]} alt={product.name} />
                    </div>
                    <div className="product-detail-info">
                        <h2>{product.name}</h2>
                        <p className="price">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                        <p className="description">{product.description}</p>
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
                        <button 
                            className={`add-to-cart-button ${showSuccess ? 'success' : ''}`} 
                            onClick={handleAddToCart} 
                            disabled={showSuccess}
                        >
                            {showSuccess ? (
                                <>Adicionado! <span className="checkmark">✓</span></>
                            ) : (
                                'Adicionar ao Carrinho'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CartModal = ({ cart, onClose, onUpdateQuantity, onRemoveItem, onCheckout, removingItems }) => {
    const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

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
                                <img src={item.images[0]} alt={item.name} />
                                <div className="cart-item-info">
                                    <h4>{item.name}</h4>
                                    {item.selectedSize && item.sizes?.length > 0 && <p>Tamanho: {item.selectedSize}</p>}
                                    {item.is_customizable && item.customText && <p>{item.custom_text_label || 'Personalização'}: "{item.customText}"</p>}
                                    <p>R$ {item.price.toFixed(2).replace('.', ',')}</p>
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
                <button onClick={onBackToStore} className="admin-button-link">Voltar para a Loja</button>
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

const AdminDashboard = ({ initialProducts, initialCategories, onDataChange, onBackToStore }) => {
    const [products, setProducts] = useState(initialProducts);
    const [categories, setCategories] = useState(initialCategories);
    
    // Estados de Edição
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');

    // Estados de Loading
    const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
    const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
    
    // Estados para o formulário de produto (controlado)
    const [productForm, setProductForm] = useState({ name: '', description: '', price: '', category_id: '', sizes: '', has_sizes: true, is_customizable: false, custom_text_label: 'Nome' });
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);

    useEffect(() => {
        // Popula o formulário quando um produto é selecionado para edição
        if (editingProduct) {
            setProductForm({
                name: editingProduct.name,
                description: editingProduct.description,
                price: editingProduct.price.toString(),
                category_id: editingProduct.category_id.toString(),
                sizes: editingProduct.sizes.join(', '),
                has_sizes: editingProduct.sizes.length > 0,
                is_customizable: editingProduct.is_customizable,
                custom_text_label: editingProduct.custom_text_label || 'Nome',
            });
            setExistingImages(editingProduct.images);
            setImagePreviews(editingProduct.images);
            setImageFiles([]);
        } else {
            resetProductForm();
        }
    }, [editingProduct]);

    const resetProductForm = () => {
        setProductForm({ name: '', description: '', price: '', category_id: categoriesWithoutAll[0]?.id.toString() || '', sizes: '', has_sizes: true, is_customizable: false, custom_text_label: 'Nome' });
        imagePreviews.forEach(URL.revokeObjectURL);
        setImageFiles([]);
        setImagePreviews([]);
        setExistingImages([]);
        setEditingProduct(null);
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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const validFiles = files.filter(file => file.type.startsWith('image/'));
            setImageFiles(prev => [...prev, ...validFiles]);

            const newPreviews = validFiles.map(file => URL.createObjectURL(file));
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number, isExisting: boolean) => {
        if (isExisting) {
            setExistingImages(prev => prev.filter((_, i) => i !== index));
            setImagePreviews(prev => prev.filter((imgUrl) => imgUrl !== existingImages[index]));
        } else {
            const fileIndex = index - existingImages.length;
            URL.revokeObjectURL(imagePreviews[index]);
            setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
            setImagePreviews(prev => prev.filter((_, i) => i !== index));
        }
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
                onDataChange(products, newCategories);
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
            setDeletingItemId(categoryId);
            const { error } = await supabase.from('categories').delete().eq('id', categoryId);
            if (error) {
                alert('Erro ao excluir categoria: ' + error.message);
            } else {
                const newCategories = categories.filter(c => c.id !== categoryId);
                setCategories(newCategories);
                onDataChange(products, newCategories);
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
            onDataChange(products, newCategories);
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
        
        // 1. Upload new images
        const uploadedImageUrls: string[] = [];
        for (const file of imageFiles) {
            const filePath = `public/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
            if (uploadError) {
                alert('Erro ao fazer upload da imagem: ' + uploadError.message);
                setIsSubmittingProduct(false);
                return;
            }
            const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
            uploadedImageUrls.push(data.publicUrl);
        }

        // 2. Remove old images if any were deleted during edit
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
            category_id: parseInt(productForm.category_id, 10),
            is_customizable: productForm.is_customizable,
            custom_text_label: productForm.is_customizable ? productForm.custom_text_label : null,
        };

        if (editingProduct) {
            // UPDATE
            const { data: updatedProduct, error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', editingProduct.id)
                .select()
                .single();
            if (error) {
                alert('Erro ao atualizar produto: ' + error.message);
            } else {
                const newProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
                setProducts(newProducts);
                onDataChange(newProducts, categories);
                resetProductForm();
            }
        } else {
            // INSERT
            const { data: addedProduct, error } = await supabase.from('products').insert(productData).select().single();
            if (error) {
                alert('Erro ao adicionar produto: ' + error.message);
            } else {
                const newProducts = [...products, addedProduct];
                setProducts(newProducts);
                onDataChange(newProducts, categories);
                resetProductForm();
            }
        }
        setIsSubmittingProduct(false);
    };

    const handleDeleteProduct = async (productId: number) => {
        const productToDelete = products.find(p => p.id === productId);
        if (!productToDelete) return;
    
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            setDeletingItemId(productId);
    
            if (productToDelete.images && productToDelete.images.length > 0) {
                const imagePaths = productToDelete.images.map(url => new URL(url).pathname.split('/product-images/')[1]);
                const { error: removeError } = await supabase.storage.from('product-images').remove(imagePaths);
                if (removeError) console.error('Erro ao remover imagens:', removeError.message);
            }
            
            const { error: deleteError } = await supabase.from('products').delete().eq('id', productId);
            if (deleteError) {
                alert('Erro ao excluir produto: ' + deleteError.message);
            } else {
                const newProducts = products.filter(p => p.id !== productId);
                setProducts(newProducts);
                onDataChange(newProducts, categories);
            }
            setDeletingItemId(null);
        }
    };
    
    const categoriesWithoutAll = categories.filter(c => c.id !== 1);

    return (
        <div className="admin-container">
            <div className="admin-header">
                 <h2>Painel do Administrador</h2>
                 <button onClick={onBackToStore} className="admin-button-link">Voltar para a Loja</button>
            </div>
            
            <div className="admin-columns">
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
                            {imagePreviews.map((src, index) => {
                                const isExisting = existingImages.includes(src);
                                return (
                                    <div key={src + index} className="image-preview-item">
                                        <img src={src} alt={`Preview ${index + 1}`} />
                                        <button type="button" onClick={() => removeImage(index, isExisting)} aria-label="Remover imagem">&times;</button>
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
                            <select id="productCategory" name="category_id" value={productForm.category_id} onChange={handleFormChange} required disabled={categoriesWithoutAll.length === 0}>
                                {categoriesWithoutAll.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                        <div className="admin-form-actions">
                            <button type="submit" className="admin-button" disabled={isSubmittingProduct || categoriesWithoutAll.length === 0}>
                                {isSubmittingProduct ? 'Salvando...' : (editingProduct ? 'Salvar Alterações' : 'Adicionar Produto')}
                            </button>
                            {editingProduct && (
                                <button type="button" className="admin-button cancel" onClick={resetProductForm}>Cancelar</button>
                            )}
                        </div>
                    </form>
                </section>

                <div className="admin-lists">
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
                                                    <button onClick={() => handleDeleteCategory(cat.id)} className="item-list-delete-button" disabled={deletingItemId === cat.id} aria-label={`Excluir categoria ${cat.name}`}>
                                                        {deletingItemId === cat.id ? '...' : 'Excluir'}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <br/>
                        <h3>Adicionar Categoria</h3>
                        <form onSubmit={handleAddCategory} className="admin-form">
                            <div className="form-group">
                                <label htmlFor="categoryName">Nome da Categoria</label>
                                <input type="text" id="categoryName" name="categoryName" required />
                            </div>
                            <button type="submit" className="admin-button secondary" disabled={isSubmittingCategory}>
                                {isSubmittingCategory ? 'Adicionando...' : 'Adicionar Categoria'}
                            </button>
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
                                            <button onClick={() => handleDeleteProduct(product.id)} className="item-list-delete-button" disabled={deletingItemId === product.id} aria-label={`Excluir produto ${product.name}`}>
                                                {deletingItemId === product.id ? '...' : 'Excluir'}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
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
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number>(1); // 1 = 'Todos'
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
            } else {
                setProducts(productsData || []);
            }

            const { data: categoriesData, error: categoriesError } = await supabase.from('categories').select('*');
            if (categoriesError) {
                console.error('Erro ao buscar categorias:', categoriesError.message);
            } else {
                setCategories([{ id: 1, name: 'Todos' }, ...(categoriesData || [])]);
            }
            
            setIsLoading(false);
        };
        fetchData();
    }, []);

    // Handlers
    const handleAddToCart = (product, quantity, selectedSize, customText) => {
        setIsCartAnimating(true);
        setTimeout(() => setIsCartAnimating(false), 600);

        setCart(prevCart => {
            const sizePart = (product.sizes?.length > 0) ? selectedSize : 'no-size';
            const customPart = product.is_customizable ? customText.trim() : 'no-custom';
            const cartItemId = `${product.id}-${sizePart}-${customPart}`;
    
            const existingItem = prevCart.find(item => item.cartItemId === cartItemId);
    
            if (existingItem) {
                return prevCart.map(item =>
                    item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prevCart, { ...product, quantity, selectedSize, customText, cartItemId }];
        });
    };

    const handleUpdateCartQuantity = (cartItemId, newQuantity) => {
        if (newQuantity < 1) {
            handleRemoveFromCart(cartItemId);
            return;
        }
        setCart(cart => cart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item));
    };
    
    const handleRemoveFromCart = (cartItemId) => {
        setRemovingItems(prev => [...prev, cartItemId]);
        setTimeout(() => {
            setCart(cart => cart.filter(item => item.cartItemId !== cartItemId));
            setRemovingItems(prev => prev.filter(id => id !== cartItemId));
        }, 300);
    };
    
    const handleCheckout = () => {
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const message = `Olá! Gostaria de fazer o seguinte pedido:\n\n` +
            cart.map(item => {
                const detailsParts = [];
                if (item.selectedSize && item.sizes?.length > 0) {
                    detailsParts.push(`Tamanho: ${item.selectedSize}`);
                }
                if (item.is_customizable && item.customText) {
                    detailsParts.push(`${item.custom_text_label || 'Personalização'}: "${item.customText}"`);
                }
                const details = detailsParts.length > 0 ? `(${detailsParts.join(', ')})` : '';

                return `*${item.name}* ${details}\n` +
                       `  Quantidade: ${item.quantity}\n` +
                       `  Preço: R$ ${item.price.toFixed(2).replace('.', ',')}`;
            }).join('\n\n') +
            `\n\n*Total do Pedido: R$ ${total.toFixed(2).replace('.', ',')}*`;
        
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };
    
    const handleAdminLogin = () => {
        sessionStorage.setItem('isAdmin', 'true');
        setCurrentView('adminDashboard');
    };

    const handleDataChange = (newProducts, newCategories) => {
        setProducts(newProducts);
        const existingCategories = newCategories.filter(c => c.id !== 1);
        setCategories([{id: 1, name: 'Todos'}, ...existingCategories]);
    };

    const navigateToStore = () => {
        setCurrentView('store');
        setSelectedCategory(1);
    };
    
    const navigateToAdminLogin = () => {
        setCurrentView('adminLogin');
    };

    // Renderização
    const filteredProducts = useMemo(() => {
        if (selectedCategory === 1) return products;
        return products.filter(p => p.category_id === selectedCategory);
    }, [products, selectedCategory]);

    const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    
    if (currentView === 'adminLogin') {
        return <AdminLogin onLogin={handleAdminLogin} onBackToStore={navigateToStore} />;
    }
    
    if (currentView === 'adminDashboard') {
        return <AdminDashboard initialProducts={products} initialCategories={categories} onDataChange={handleDataChange} onBackToStore={navigateToStore} />;
    }

    return (
        <>
            <Header onCartClick={() => setIsCartOpen(true)} cartItemCount={cartItemCount} onLogoClick={navigateToStore} isCartAnimating={isCartAnimating} />
            <main>
                <img src="Principal.png" alt="Banner Marçal Artigos Militares" className="main-banner" />
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
                        {filteredProducts.length > 0 ? filteredProducts.map(product => (
                            <ProductCard key={product.id} product={product} onProductClick={setSelectedProduct} />
                        )) : <p>Nenhum produto encontrado nesta categoria.</p>}
                    </div>
                )}
            </main>
            <Footer onAdminClick={navigateToAdminLogin} />

            {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={handleAddToCart} />}
            {isCartOpen && <CartModal cart={cart} onClose={() => setIsCartOpen(false)} onUpdateQuantity={handleUpdateCartQuantity} onRemoveItem={handleRemoveFromCart} onCheckout={handleCheckout} removingItems={removingItems} />}
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);