# Reporte de Proyecto: CineStream - Product Backlog & Plan de Sprints

Este documento contiene la documentación oficial del backlog, estimaciones y planificación técnica para el sistema de gestión cinematográfica **CineStream**.

---

## 1. Resumen del Proyecto
**Stack Tecnológico:**
- **Frontend:** React (Vite), Vanilla CSS, Recharts, jsPDF.
- **Backend:** Node.js, Express, JWT, AES-256.
- **Base de Datos:** PostgreSQL.

---

## 2. Plan de Sprints (Estimación Story Points)
*Capacidad sugerida: 35-40 SP por Sprint.*

| Sprint | Enfoque | Historias Incluidas | Total Puntos |
| :--- | :--- | :--- | :---: |
| **Sprint 1** | Infraestructura y Base | HU-01 a HU-08 | 29 |
| **Sprint 2** | Operaciones y Horarios | HU-09 a HU-12, HU-27, HU-28, HU-24 | 34 |
| **Sprint 3** | Venta Web y Pagos | HU-13 a HU-16, HU-17 a HU-19, HU-30 | 42 |
| **Sprint 4** | POS Staff y Control | HU-20 a HU-23, HU-25, HU-26, HU-29 | 37 |
| **Sprint 5** | BI y Consolidación | HU-31 a HU-34, Seguridad Final | 32 |

---

## 3. Product Backlog Detallado

### 🔐 E1: Autenticación & Seguridad
| ID | Historia de Usuario | SP | Criterios de Aceptación (DoD) | Tareas Técnicas |
| :--- | :--- | :---: | :--- | :--- |
| **HU-01** | Como visitante, quiero registrarme con email/contraseña y un rol asignado, para acceder al sistema. | 5 | 1. Registro valida email único. 2. Contraseña hasheada con bcrypt (≥12 rounds). 3. Rol asignado por defecto: 'cliente'. 4. Retorna JWT firmado al completar. | **FE:** Formulario de registro con validación Zod. **BE:** POST /auth/register, hash bcrypt. **DB:** users(uuid, email, password_hash, role, created_at). |
| **HU-02** | Como usuario registrado, quiero iniciar sesión y recibir un token JWT, para autenticarme en la app. | 3 | 1. Login valida credenciales y retorna access + refresh token. 2. Token expira en 24h. 3. Refresh token válido por 7 días. 4. Mensajes de error genéricos (sin revelar qué campo falló). | **FE:** Login form, almacenamiento en httpOnly cookie o localStorage. **BE:** POST /auth/login, POST /auth/refresh. **DB:** refresh_tokens table. |
| **HU-03** | Como sistema, quiero proteger rutas por rol (cliente, staff, portero, admin), para garantizar el control de acceso. | 5 | 1. Middleware requireRole(['admin']) en rutas sensibles. 2. Retorna 403 si el rol no coincide. 3. Rutas del POS solo accesibles por staff/admin. 4. Pruebas de acceso no autorizado devuelven error claro. | **FE:** ProtectedRoute HOC con verificación de rol. **BE:** Middleware authenticate + authorize. **DB:** Campo role ENUM('cliente','staff','portero','admin'). |
| **HU-04** | Como usuario, quiero cerrar sesión de forma segura, para proteger mi cuenta. | 2 | 1. Logout invalida el refresh token en DB. 2. Limpia cookies/localStorage. 3. Redirige al login. | **FE:** Botón logout en header + confirmación. **BE:** POST /auth/logout, blacklist del token. **DB:** Eliminar o invalidar registro en refresh_tokens. |

### 🎬 E2: Gestión de Cartelera (Admin)
| ID | Historia de Usuario | SP | Criterios de Aceptación (DoD) | Tareas Técnicas |
| :--- | :--- | :---: | :--- | :--- |
| **HU-05** | Como Admin, quiero crear y editar películas con múltiples géneros (ej: Superhéroe, Acción), para mantener el catálogo actualizado. | 5 | 1. CRUD completo con validación (título, duración, clasificación, poster). 2. Soporte de N géneros por película (relación N:N). 3. Género personalizable (no solo lista fija). 4. Poster cargado por URL o subida de archivo. | **FE:** Formulario de película con Multi-Select de géneros. **BE:** POST/PUT/DELETE /movies, validación Zod. **DB:** movies, genres, movie_genres (N:N). |
| **HU-06** | Como Admin, quiero eliminar películas del catálogo, para mantener la cartelera vigente. | 3 | 1. Soft-delete (no borra físicamente). 2. No se puede eliminar si tiene funciones activas futuras. 3. Confirmación antes de eliminar. | **FE:** Modal de confirmación con advertencia si hay funciones. **BE:** DELETE /movies/:id (set is_active=false). **DB:** Campo is_active BOOLEAN DEFAULT true. |
| **HU-07** | Como Cliente, quiero ver la cartelera activa con filtros por género y horario, para elegir mi película. | 5 | 1. Solo muestra funciones con status='active' y fecha futura. 2. Filtros funcionales por género, fecha y sala. 3. Vista en cards con poster, título, clasificación y horarios. | **FE:** Cartelera con filtros reactivos, cards de película (Code Splitting). **BE:** GET /screenings?genre=&date=. **DB:** JOIN movies, screenings, rooms. |
| **HU-08** | Como Cliente, quiero ver el detalle de una película, para conocer sinopsis, duración y funciones disponibles. | 3 | 1. Página de detalle con todos los atributos de la película. 2. Lista de funciones del día con hora y disponibilidad de asientos. 3. Botón directo a compra de boletos. | **FE:** MovieDetailPage con React.lazy (Code Splitting). **BE:** GET /movies/:id con funciones anidadas. **DB:** Query compuesta de movies + screenings + seats. |

### 📅 E3: Programación de Funciones (Admin)
| ID | Historia de Usuario | SP | Criterios de Aceptación (DoD) | Tareas Técnicas |
| :--- | :--- | :---: | :--- | :--- |
| **HU-09** | Como Admin, quiero programar funciones asignando sala, película, fecha/hora y precio, para organizar la cartelera. | 5 | 1. Formulario requiere todos los campos obligatorios. 2. end_time calculado automáticamente (start + duración). 3. Permite configurar precio diferenciado por función. | **FE:** Schedule Form con datetime picker. **BE:** POST /screenings con cálculo de end_time. **DB:** screenings(id, movie_id, room_id, start_time, end_time, price, status). |
| **HU-10** | Como Admin, quiero que el sistema me alerte si dos funciones chocan en la misma sala, para evitar conflictos de horario. | 8 | 1. Validación de overlap: new.start < existing.end AND new.end > existing.start. 2. Error descriptivo indica qué función genera el conflicto. 3. La función NO se guarda si hay conflicto. | **FE:** Mensaje de error inline en el formulario. **BE:** OverlapService.check(room_id, start_time, end_time). **DB:** Query con WHERE room_id = ? AND NOT (end_time <= ? OR start_time >= ?). |
| **HU-11** | Como Admin, quiero ver un calendario visual de las funciones programadas por sala, para tener visión global. | 5 | 1. Vista de calendario semanal/diario por sala. 2. Click en función muestra detalles y opción de editar. 3. Color diferente por sala. | **FE:** Calendario con react-big-calendar o grilla custom. **BE:** GET /screenings?room_id=&week=. **DB:** Query por rango de fechas. |
| **HU-12** | Como Admin, quiero cancelar o modificar una función programada, para gestionar imprevistos. | 3 | 1. Cancelar función actualiza status='cancelled'. 2. Si hay tickets vendidos, se muestra advertencia. 3. Modificación de horario re-valida overlap. | **FE:** Opciones Editar/Cancelar en detalle de función. **BE:** PUT /screenings/:id, PATCH /screenings/:id/cancel. **DB:** Update status field. |

### 🎟️ E4: Compra de Boletos (Cliente)
| ID | Historia de Usuario | SP | Criterios de Aceptación (DoD) | Tareas Técnicas |
| :--- | :--- | :---: | :--- | :--- |
| **HU-13** | Como Cliente, quiero seleccionar mis asientos en un mapa interactivo de la sala, para elegir mi ubicación preferida. | 13 | 1. Mapa visual por fila/columna con estado: Libre (verde), Ocupado (rojo), Seleccionado (amarillo). 2. Bloqueo temporal (5 min) al seleccionar asiento. 3. Máximo configurable de asientos por compra. | **FE:** SeatPicker (SVG/Grid), estado gestionado con Context. **BE:** POST /seats/lock, DELETE /seats/lock (con TTL). **DB:** seats(id, room_id, row, col, status). |
| **HU-14** | Como Cliente, quiero agregar snacks a mi pedido durante la compra, para ordenar desde mi asiento. | 5 | 1. Catálogo de snacks con imagen, precio y stock disponible. 2. Botones +/- para modificar cantidad. 3. No permite agregar producto sin stock. 4. Total del carrito se actualiza en tiempo real. | **FE:** SnackPicker component, carrito reactivo. **BE:** GET /products?available=true. **DB:** JOIN products filtrando stock_quantity > 0. |
| **HU-15** | Como Cliente, quiero revisar un resumen de mi compra antes de pagar, para confirmar mi pedido. | 5 | 1. Resumen muestra: película, función, asientos, snacks y total. 2. Permite eliminar ítems del resumen. 3. Subtotal, impuestos y total claramente desglosados. | **FE:** OrderSummary component en stepper de compra. **BE:** POST /orders/preview (sin guardar). **DB:** Sin persistencia en este paso. |
| **HU-16** | Como Cliente, quiero ver mi historial de compras, para consultar mis tickets pasados. | 5 | 1. Lista paginada de órdenes con estado (activo, usado, cancelado). 2. Click en orden muestra detalle + opción de re-descargar PDF. 3. Filtro por mes/año. | **FE:** PurchaseHistory page con paginación. **BE:** GET /orders?userId=&page=&limit=. **DB:** orders(id, user_id, total, status, created_at). |

### 💳 E5: Pago y Entrega de Tickets (Cliente)
| ID | Historia de Usuario | SP | Criterios de Aceptación (DoD) | Tareas Técnicas |
| :--- | :--- | :---: | :--- | :--- |
| **HU-17** | Como Cliente, quiero pagar mediante un código QR generado, para completar mi compra de forma segura. | 8 | 1. QR generado con datos encriptados en AES-256 (order_id + user_id + timestamp). 2. QR válido por 15 minutos para completar el pago simulado. 3. Transición automática al confirmar pago. | **FE:** QRPaymentDisplay con cuenta regresiva. **BE:** POST /payments/initiate, EncryptionService (AES-256). **DB:** payments(id, order_id, qr_hash, status, expires_at). |
| **HU-18** | Como Cliente, quiero descargar mi ticket en formato PDF (sin envío por correo), para tenerlo listo para el ingreso. | 5 | 1. PDF generado en cliente con jsPDF. 2. Incluye: nombre del cliente, película, sala, asientos, fecha/hora y QR del ticket. 3. Botón de descarga disponible inmediatamente tras el pago. 4. Re-descargable desde el historial. | **FE:** TicketPDFGenerator con jsPDF + qrcode.react. **BE:** GET /tickets/:orderId retorna datos para el PDF. **DB:** tickets(id, order_id, unique_hash, status). |
| **HU-19** | Como Cliente, quiero recibir confirmación inmediata de mi compra en pantalla, para saber que el proceso fue exitoso. | 3 | 1. Pantalla de éxito con animación y resumen de compra. 2. Muestra botones: "Descargar PDF" e "Ir a Historial". 3. Limpia el carrito de compras tras confirmación. | **FE:** PurchaseSuccessPage con animación Lottie/CSS. **BE:** Confirmación del estado del pago (status='completed'). **DB:** Actualizar orders.status = 'confirmed'. |

### 🏪 E6: POS Staff — Punto de Venta Físico
| ID | Historia de Usuario | SP | Criterios de Aceptación (DoD) | Tareas Técnicas |
| :--- | :--- | :---: | :--- | :--- |
| **HU-20** | Como Staff, quiero vender boletos y snacks de forma combinada desde el POS físico, para atender clientes en taquilla. | 8 | 1. Flujo completo: selección de función → asientos → snacks → cobro. 2. Registro de venta asociado al ID del empleado. 3. Soporte para pago en efectivo y QR. | **FE:** PosPanel con stepper (Code Splitting en bundle staff). **BE:** POST /pos/transactions. **DB:** pos_transactions(id, staff_id, order_id, payment_method). |
| **HU-21** | Como Staff, quiero realizar ventas de "Solo Dulcería" sin seleccionar función/asiento, para agilizar la atención. | 5 | 1. Modo "Solo Dulcería" disponible desde pantalla principal del POS. 2. Solo muestra catálogo de snacks con cantidades. 3. Genera recibo simple sin QR de función. | **FE:** Toggle en POS entre "Boletos+Snacks" y "Solo Dulcería". **BE:** POST /pos/snack-only endpoint separado. **DB:** Registro en pos_transactions con type='snack_only'. |
| **HU-22** | Como Staff, quiero realizar el arqueo de caja al final de mi turno, para el control financiero. | 8 | 1. Muestra resumen del turno: total ventas, cantidad de transacciones por método de pago. 2. Permite ingresar efectivo físico contado para validar contra el sistema. 3. Genera reporte de arqueo firmado con ID del empleado. | **FE:** CashCloseModal con inputs y resumen. **BE:** POST /pos/cash-close. **DB:** cash_logs(id, staff_id, shift_date, system_total, counted_total, difference). |
| **HU-23** | Como Admin, quiero ver el historial de transacciones del POS auditado por empleado, para supervisar las ventas. | 5 | 1. Tabla filtrable por empleado, fecha y tipo de venta. 2. Muestra diferencias en arqueos de caja. 3. Exportable a CSV. | **FE:** AuditDashboard en panel admin. **BE:** GET /pos/audit?staffId=&date=. **DB:** JOIN pos_transactions + cash_logs + users. |

### 🚪 E7: Validación de Entrada — Portero (Usher)
| ID | Historia de Usuario | SP | Criterios de Aceptación (DoD) | Tareas Técnicas |
| :--- | :--- | :---: | :--- | :--- |
| **HU-24** | Como Portero, quiero escanear el QR de un ticket para validar la entrada, para controlar el acceso a la sala. | 5 | 1. Cámara activa en interfaz móvil/tablet. 2. Desencriptación AES-256 en el servidor. 3. Feedback inmediato: ✅ Verde (válido) / ❌ Rojo (inválido). 4. Validación completa en < 1 segundo. | **FE:** QRScannerView con react-qr-reader. **BE:** POST /tickets/validate con DecryptionService. **DB:** Lectura + update de tickets.status. |
| **HU-25** | Como Portero, quiero que el sistema rechace un ticket ya escaneado anteriormente, para evitar el ingreso doble. | 5 | 1. Si ticket.status = 'USED', retorna error con mensaje "Ticket ya utilizado". 2. Muestra fecha y hora del primer uso. 3. Registro del intento fallido en log de auditoría. | **FE:** Pantalla de error con detalle del intento duplicado. **BE:** Check de status antes de actualizar. **DB:** ticket_validations(id, ticket_id, scanned_at, result). |
| **HU-26** | Como Portero, quiero ver el historial de tickets validados en mi turno, para llevar control del aforo. | 3 | 1. Lista de últimos 20 tickets validados (timestamp + resultado). 2. Contador de entradas por función. 3. Indicador de aforo: entradas validadas vs. capacidad total. | **FE:** Panel lateral en UsherView. **BE:** GET /screenings/:id/validations. **DB:** Query sobre ticket_validations + screenings.capacity. |

### 📦 E8: Inventario de Snacks (Admin)
| ID | Historia de Usuario | SP | Criterios de Aceptación (DoD) | Tareas Técnicas |
| :--- | :--- | :---: | :--- | :--- |
| **HU-27** | Como Admin, quiero gestionar el catálogo de snacks (CRUD), para controlar los productos disponibles. | 5 | 1. CRUD completo con nombre, precio, imagen, categoría y stock inicial. 2. Categorías: bebidas, confitería, combos. 3. Activar/Desactivar producto sin eliminarlo. | **FE:** InventoryPanel con tabla editable. **BE:** POST/PUT/DELETE /products. **DB:** products(id, name, price, category, stock_quantity, min_stock, is_active). |
| **HU-28** | Como Admin, quiero recibir alertas de stock bajo, para reabastecer a tiempo. | 3 | 1. Alerta visual si stock_quantity ≤ min_stock. 2. Badge de alerta en el ícono de inventario del menú. 3. Listado de productos en alerta accesible desde el dashboard. | **FE:** Badge en NavMenu, StockAlertList en dashboard. **BE:** GET /products/low-stock. **DB:** Query WHERE stock_quantity <= min_stock AND is_active=true. |
| **HU-29** | Como Admin, quiero registrar reabastecimientos de inventario, para mantener el historial de movimientos. | 5 | 1. Formulario de reabastecimiento con cantidad, proveedor y fecha. 2. Stock se actualiza transaccionalmente (evita condiciones de carrera). 3. Historial de reabastecimientos por producto. | **FE:** RestockModal en detalle de producto. **BE:** POST /products/:id/restock con transacción SQL. **DB:** stock_movements(id, product_id, type, quantity, reason, created_at). |
| **HU-30** | Como sistema, quiero decrementar el stock automáticamente al completarse una venta (POS o web), para mantener inventario en tiempo real. | 8 | 1. Decremento atómico en transacción SQL (evita overselling). 2. Venta falla si stock insuficiente antes de confirmar. 3. Rollback automático si el pago falla. | **FE:** Error de stock insuficiente en carrito. **BE:** Stock decrement dentro de DB transaction (BEGIN/COMMIT/ROLLBACK). **DB:** UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?. |

### 📊 E9: Business Intelligence & Reportes
| ID | Historia de Usuario | SP | Criterios de Aceptación (DoD) | Tareas Técnicas |
| :--- | :--- | :---: | :--- | :--- |
| **HU-31** | Como Admin, quiero ver un dashboard con KPIs principales, para tomar decisiones rápidas. | 5 | 1. KPIs: ingresos del día/semana/mes, tickets vendidos, función más popular, producto más vendido. 2. Datos actualizados al cargar la página. 3. Cards con tendencia vs. período anterior (↑/↓). | **FE:** AdminDashboard con Cards de KPIs (Recharts). **BE:** GET /reports/kpis?period=. **DB:** Queries de agregación con GROUP BY + DATE_TRUNC. |
| **HU-32** | Como Admin, quiero ver gráficas de ventas por película y por horario, para identificar las funciones más rentables. | 8 | 1. Gráfica de barras (Recharts BarChart): ingresos por película. 2. Gráfica de línea: tendencia de ventas semanal. 3. Filtros por rango de fechas. | **FE:** SalesChart con Recharts BarChart y LineChart. **BE:** GET /reports/sales?from=&to=. **DB:** JOIN orders + screenings + movies con GROUP BY. |
| **HU-33** | Como Admin, quiero ver un reporte de productos de dulcería más vendidos, para optimizar el inventario. | 5 | 1. Gráfica de pie/donut (Recharts PieChart) con top 5 snacks. 2. Tabla con unidades vendidas e ingresos por producto. 3. Exportable a CSV/Excel. | **FE:** SnackReportView con Recharts PieChart. **BE:** GET /reports/snacks?from=&to=. **DB:** JOIN order_items + products con GROUP BY y ORDER BY. |
| **HU-34** | Como Admin, quiero ver reportes de aforo por función, para medir la ocupación de las salas. | 5 | 1. Porcentaje de ocupación por función y sala. 2. Identificar funciones con baja ocupación para tomar acciones. 3. Vista de ocupación por día de la semana (heatmap o barras). | **FE:** OccupancyReport con Recharts. **BE:** GET /reports/occupancy. **DB:** COUNT(tickets) / rooms.capacity * 100 por screening. |

---

## 4. Consideraciones Técnicas Finales
- **Seguridad:** Uso de AES-256-CBC para la integridad de los tickets QR.
- **Rendimiento:** Code Splitting implementado para separar las vistas de Administración de las del Cliente.
- **Integridad:** Transacciones SQL ACID para evitar duplicidad en la reserva de asientos.
- **UX/UI:** Diseño premium, dark mode por defecto, micro-animaciones para feedback de usuario.

