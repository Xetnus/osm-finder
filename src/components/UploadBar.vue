<script>
  export default {
    emits: ['next', 'upload'],
    data() {
      return {
        dialogVisible: false,
      }
    },
    mounted() {
      document.addEventListener('dragover', (e) => {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.dialogVisible = true;
      });

      document.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        e.preventDefault();
        // Ensures that the user's mouse actually left the window
        if (e.clientX == 0 && e.clientY == 0) {
          this.dialogVisible = false;
        }
      });

      document.addEventListener('drop', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.dialogVisible = false;

        let file = e.dataTransfer.files[0];
        // Sends the file link up the chain for further processing
        this.$emit('upload', file);
      });

      document.addEventListener('keydown', this.keyDownListener);
    },
    methods: {
      keyDownListener(event) {
        if (event.key.toLowerCase() === 'u') {
          this.upload();
        } else if (event.key === 'ArrowRight') {
          this.handleNext();
        }
      },
      handleNext(event) {
        document.removeEventListener('keydown', this.keyDownListener);
        this.$emit('next')
      },
      upload() {
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = '.jpg,.jpeg,.png,.bmp';

        input.onchange = (e) => {
          let file = e.target.files[0];
          // Sends the file link up the chain for further processing
          this.$emit('upload', file);
        }
        input.click();
      },
    }
  }
</script>

<template>
  <div class="input-bar-flex">
    <q-btn @click="upload" size="lg" icon="upload" label="Upload Photo" color="primary">
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Click here or drag and drop to upload an image.
      </q-tooltip>
    </q-btn>
    <q-btn @click="handleNext" size="lg" label="Next" color="primary"/>

    <q-dialog v-model="dialogVisible">
      <q-card>
        <q-card-section class="q-px-xl q-mx-xl q-mb-none q-pb-none">
          <q-btn icon="image" class="q-px-xl q-mx-xl" size="xl" flat round />
        </q-card-section>

        <q-card-section class="q-px-xl q-pb-lg q-mx-xl q-pt-none q-mt-none">
          Drag and drop to upload an image.
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
  div {
    color: black;
  }
</style>
