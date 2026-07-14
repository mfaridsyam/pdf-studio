<template>
  <component
    :is="icon"
    v-if="icon"
    :size="size"
    :stroke-width="strokeWidth"
    v-bind="$attrs"
  />
</template>

<script setup>
import { computed } from 'vue'
import {
  GitMerge, Scissors, Minimize2, RotateCw, ListOrdered, Hash,
  Image, Camera, FileText, BarChart2, FileOutput, FileSpreadsheet,
  UploadCloud, Download, X, GripVertical, Check, AlertTriangle,
  Info, ArrowRight, ArrowLeft, Search, Printer, Plus, ChevronLeft,
  File, Smartphone, RefreshCw, FolderOpen, Lock, Unlock,
  FileMinus, Copy, Layers, FileInput, ChevronDown, Eye, EyeOff,
  ImagePlus, Shuffle, AlignLeft, List,
  Crop, Wrench, PenLine, Eraser, Code2,
} from '@lucide/vue'

const ICONS = {
  GitMerge, Scissors, Minimize2, RotateCw, ListOrdered, Hash,
  Image, Camera, FileText, BarChart2, FileOutput, FileSpreadsheet,
  UploadCloud, Download, X, GripVertical, Check, AlertTriangle,
  Info, ArrowRight, ArrowLeft, Search, Printer, Plus, ChevronLeft,
  File, Smartphone, RefreshCw, FolderOpen, Lock, Unlock,
  FileMinus, Copy, Layers, FileInput, ChevronDown, Eye, EyeOff,
  ImagePlus, Shuffle, AlignLeft, List,
  Crop, Wrench, PenLine, Eraser, Code2,
}

const props = defineProps({
  name:        { type: String,           required: true },
  size:        { type: [Number, String], default: 20   },
  strokeWidth: { type: [Number, String], default: 1.75 },
})

const icon = computed(() => ICONS[props.name] || null)
</script>
