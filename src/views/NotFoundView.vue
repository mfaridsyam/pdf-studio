<template>
  <div class="not-found">
    <div class="nf-inner">
      <div class="nf-icon">📄</div>
      <h1>404</h1>
      <p>Halaman tidak ditemukan.</p>
      <RouterLink to="/" class="btn-home">← Kembali ke Beranda</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.not-found   { display: flex; align-items: center; justify-content: center; flex: 1; padding: 60px 24px; }
.nf-inner    { text-align: center; }
.nf-icon     { font-size: 52px; margin-bottom: 16px; }
h1           { font-size: 48px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
p            { font-size: 16px; color: var(--text-2); margin-bottom: 24px; }
.btn-home {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 22px; background: var(--red); color: #fff;
  border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;
  transition: background .2s;
}
.btn-home:hover { background: var(--red-dark); }
</style>
