# certs

Optional corporate root CA certificates (`*.crt`, PEM) for the image builds. `*.crt` files are gitignored.

The Containerfiles do not read this folder (D9: the classic builder used by `podman compose` does not support compose `additional_contexts`, and the build contexts are `Backend/` and `Frontend/`, which do not contain `certs/`).

Add a certificate here only if a build fails with a TLS error (`x509`, `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`), then ask the Container Builder to wire it in: the `.crt` files are copied into the gitignored `Backend/ca/` and `Frontend/ca/`, with a build-stage-only `COPY ca/` plus `NODE_EXTRA_CA_CERTS` for `npm` (see `docs/context/containers.md`). Never commit or stage certificates. Runtime images never contain it. TLS verification is never disabled.
