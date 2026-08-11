Pedidos, reservas y stock de Tierra Mate Shop

Obtener el contexto

Ubicar el proyecto por apps/api, database/migrations y AGENTS.md.

Leer AGENTS.md y la migración vigente antes de escribir código.

Verificar si existen endpoints, servicios y pruebas; una tabla no implica queel flujo esté implementado.

Mantener precio y stock por variante.

Aplicar las reglas centrales

Recibir nombre, teléfono, localidad y dirección antes de generar el pedido.

Permitir opciones de personalización y una nota cuando la opción lo admita.

Crear la reserva justo antes de abrir WhatsApp y mantenerla 30 minutos, usandostore_settings.reservation_minutes como fuente configurable.

Calcular disponibilidad de una variante como:stock físico - unidades de reservas vigentes.

No modificar stock_quantity ni crear movimientos por reservar, vencer o cancelar.

Descontar stock físico únicamente al confirmar la venta.

Registrar cada descuento confirmado en inventory_movements.

Crear una reserva de forma segura

Validar y normalizar todos los ítems, cantidades y personalizaciones.

Abrir una transacción.

Bloquear las variantes necesarias con SELECT ... FOR UPDATE, siempre en ordende ID para reducir bloqueos cruzados.

Recalcular dentro de la transacción las reservas con estado reserved yreserved_until > now().

Rechazar el pedido completo si alguna variante no tiene disponibilidad.

Copiar en order_items nombre, variante, SKU y precio actuales para preservarel historial; recalcular totales en el servidor.

Crear el pedido con estado reserved y vencimiento calculado por PostgreSQL.

Confirmar la transacción antes de devolver el texto o enlace de WhatsApp.

Confirmar, cancelar y vencer

Usar una transición explícita de estados; no permitir saltos arbitrarios.

Hacer confirmación idempotente: repetir la petición no debe descontar dos veces.

Al confirmar, bloquear pedido y variantes, comprobar que la reserva siga vigente,descontar con una condición que impida stock negativo y registrar movimientos.

Al cancelar o vencer, cambiar solamente el estado y sus marcas de tiempo.

No depender únicamente de una tarea programada para liberar disponibilidad:ignorar reservas vencidas en todas las consultas aunque aún figuren reserved.

Permitir una tarea de limpieza que cambie reservas vencidas a expired.

Probar concurrencia y exactitud

Probar reserva válida, datos inválidos, personalización inválida y stock insuficiente.

Probar dos reservas simultáneas por la última unidad disponible.

Probar confirmación repetida, confirmación vencida, cancelación y expiración.

Probar cálculos con varias cantidades y adicionales de personalización.

Verificar rollback total ante cualquier error intermedio.

Ejecutar npm test y señalar si faltan pruebas de integración con PostgreSQL real.

Evitar errores frecuentes

No confiar en precios, totales, estado o disponibilidad enviados por el navegador.

No decrementar stock al abrir el carrito ni al agregar un producto.

No sumar stock al vencer una reserva, porque nunca se descontó físicamente.

No ejecutar escrituras parciales fuera de una transacción.

No exponer datos sensibles ni conectar React directamente a PostgreSQL.


