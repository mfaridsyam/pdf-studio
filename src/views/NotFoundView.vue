<template>
  <div class="not-found">
    <div class="nf-inner">
      <div class="nf-icon">
        <File :size="44" :stroke-width="1" />
      </div>
      <h1>404</h1>
      <p>Halaman tidak ditemukan.</p>
      <RouterLink to="/" class="btn-home">
        <ChevronLeft :size="15" />
        Kembali ke Beranda
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { File, ChevronLeft } from '@lucide/vue'
</script>

<style scoped>
.not-found   { display: flex; align-items: center; justify-content: center; flex: 1; padding: 60px 24px; }
.nf-inner    { text-align: center; }
.nf-icon     { color: var(--c-300); margin-bottom: 16px; display: flex; justify-content: center; }
h1           { font-size: 48px; font-weight: 700; color: var(--text); margin-bottom: 8px; letter-spacing: -2px; }
p            { font-size: 15px; color: var(--text-2); margin-bottom: 24px; }
.btn-home {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px; background: var(--c-950); color: var(--c-white);
  border-radius: var(--radius-sm); text-decoration: none; font-weight: 500; font-size: 14px;
  transition: background .15s, transform .15s;
}
.btn-home:hover { background: var(--c-800); transform: translateY(-1px); }
</style>
