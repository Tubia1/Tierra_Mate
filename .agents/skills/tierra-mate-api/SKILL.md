---
name: tierra-mate-api
description: Desarrollar, corregir, explicar o revisar el backend Node.js y Express de Tierra Mate Shop. Usar para endpoints, CRUD, autenticación administrativa, validaciones Zod, servicios, repositorios PostgreSQL, errores HTTP y pruebas dentro de apps/api.
---

# Backend de Tierra Mate Shop

## Preparar el trabajo

- Ubicar la raíz que contiene `package.json`, `apps/api` y `AGENTS.md`.
- Leer `AGENTS.md` completo antes de proponer o modificar código.
- Inspeccionar la ruta, esquema, servicio, repositorio y prueba relacionados.
- Diferenciar comportamiento ya implementado de tablas o planes todavía sin API.

## Mantener la arquitectura

- Conservar el flujo controller -> service -> repository -> PostgreSQL.
- Definir rutas y semántica HTTP en controllers.
- Validar params, query y body con Zod antes del servicio.
- Colocar reglas del negocio y errores esperables en services.
- Mantener SQL parametrizado y persistencia en repositories.
- Usar `asyncHandler` y `AppError`; no duplicar manejo genérico de errores.
- Mantener módulos ES y el estilo existente antes de introducir abstracciones.

## Proteger la API

- Mantener públicas las lecturas necesarias para el catálogo.
- Proteger escrituras administrativas con `requireAdmin`.
- No agregar login al comprador.
- No crear roles: las cuentas administrativas tienen el mismo acceso salvo que el usuario cambie expresamente esa decisión.
- No exponer secretos ni registrar tokens, contraseñas o `DATABASE_URL` completa.
- No conectar el frontend directamente a PostgreSQL.

## Preservar contratos

- Responder éxitos con `{ data: ... }` y paginación con `pagination`.
- Responder errores mediante el middleware existente.
- Usar códigos estables como `PRODUCT_NOT_FOUND` o `VALIDATION_ERROR`.
- Conservar borrado lógico o desactivación cuando exista historial relacionado.
- Agregar una migración nueva si el cambio requiere modificar el esquema.

## Verificar

- Agregar pruebas del camino exitoso, validación, autorización y errores relevantes.
- Ejecutar `npm test` desde la raíz.
- Si la prueba necesita Supabase real, mantener separadas las pruebas unitarias de las de integración y no introducir credenciales en el repositorio.
- Informar archivos modificados, pruebas ejecutadas y trabajo que siga pendiente.

## Explicar al usuario

- Usar español claro y explicar qué responsabilidad tiene cada capa.
- Mostrar ejemplos concretos de request y response cuando ayuden.
- No afirmar que una funcionalidad está completa sin verificar rutas, lógica y pruebas.
