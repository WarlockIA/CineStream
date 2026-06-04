const { Product, sequelize } = require('../models');

class ProductController {
  async getAllProducts(req, res) {
    try {
      const products = await Product.findAll({ order: [['name', 'ASC']] });
      res.status(200).json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener productos', error: error.message });
    }
  }

  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { stock, price } = req.body;

      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }

      const oldStock = product.stock;
      const oldPrice = product.price;

      if (stock !== undefined) {
        if (typeof stock !== 'number' || stock < 0 || !Number.isInteger(stock)) {
          return res.status(400).json({ success: false, message: 'Stock inválido. Debe ser un número entero mayor o igual a 0.' });
        }
        product.stock = stock;
      }
      
      if (price !== undefined) {
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice < 0) {
          return res.status(400).json({ success: false, message: 'Precio inválido. Debe ser un número mayor o igual a 0.' });
        }
        product.price = numPrice;
      }

      await product.save();

      // Auditoría
      const { logAction } = require('../utils/auditLogger');
      await logAction(
        req.user.userId, 
        'PRODUCT_UPDATED', 
        'Product', 
        product.id, 
        { 
          changes: {
            stock: stock !== undefined ? { old: oldStock, new: stock } : undefined,
            price: price !== undefined ? { old: oldPrice, new: price } : undefined
          }
        }, 
        req
      );

      res.status(200).json({ success: true, message: 'Producto actualizado con éxito', data: product });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al actualizar producto', error: error.message });
    }
  }
  async sellProducts(req, res) {
    const { items } = req.body; // array of { id, quantity }
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'El pedido está vacío' });
    }

    const transaction = await sequelize.transaction();

    try {
      for (const item of items) {
        const product = await Product.findByPk(item.id, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!product) {
          throw new Error(`Producto ${item.id} no encontrado`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${product.name}. Solo quedan ${product.stock} unidades.`);
        }

        product.stock -= item.quantity;
        await product.save({ transaction });
      }

      await transaction.commit();
      res.status(200).json({ success: true, message: 'Venta realizada con éxito' });
    } catch (error) {
      await transaction.rollback();
      res.status(400).json({ success: false, message: error.message || 'Error al procesar la venta' });
    }
  }
}

module.exports = new ProductController();
