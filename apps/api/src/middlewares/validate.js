export function validate(schemas) {
  return (req, _res, next) => {
    req.validated = {
      body: schemas.body ? schemas.body.parse(req.body) : req.body,
      params: schemas.params ? schemas.params.parse(req.params) : req.params,
      query: schemas.query ? schemas.query.parse(req.query) : req.query,
    };
    next();
  };
}
