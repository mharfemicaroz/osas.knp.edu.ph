// src/composables/useTinyMCE.js
import { ref } from "vue";

export function useTinyMCE() {
  const editorRef = ref(null);
  const isFullscreen = ref(false);

  const onInit = (_evt, editor) => {
    editorRef.value = editor;
  };

  const toggleFullscreen = () => {
    if (!editorRef.value) return;
    editorRef.value.execCommand("mceFullScreen");
    isFullscreen.value = !isFullscreen.value;
  };

  const ensureExitFullscreen = () => {
    if (isFullscreen.value && editorRef.value) {
      editorRef.value.execCommand("mceFullScreen");
      isFullscreen.value = false;
    }
  };

  const tinymceInit = {
    menubar: false,
    height: 320,
    plugins: "lists link image table code paste fullscreen",
    toolbar:
      "undo redo | blocks | bold italic underline strikethrough | " +
      "forecolor backcolor | alignleft aligncenter alignright alignjustify | " +
      "bullist numlist outdent indent | link image | removeformat | code | fullscreen",
    paste_data_images: true,
    image_dimensions: true,
    image_caption: true,
    object_resizing: "img",
    branding: false,
    content_style:
      "body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; font-size:14px}",
    automatic_uploads: false,
    file_picker_types: "image",
    file_picker_callback: (cb) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => cb(reader.result);
        reader.readAsDataURL(file);
      };
      input.click();
    },
  };

  return {
    editorRef,
    isFullscreen,
    onInit,
    toggleFullscreen,
    ensureExitFullscreen,
    tinymceInit,
  };
}
