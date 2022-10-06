<script setup>
  import InteractiveCanvas from './components/InteractiveCanvas.vue'
  import InputBar from './components/InputBar.vue'
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="./assets/logo.svg" width="125" height="125" />
  </header>

  <section id="canvas-section">
    <InteractiveCanvas msg="Hello World"/>
  </section>

  <section id="input-section">
    <InputBar />
  </section>
</template>

<style scoped>
  header {
    position: absolute;
    left: 0;
    right: 0;
    width: 10em;
    margin: auto;
    z-index: 1;
    background-color: grey;
  }

  #canvas-section {
    background-color: lightsteelblue;
    height: 80%;
    width: 100%;
  }

  #input-section {
    background-color: grey;
    height: 20%;
    width: 100%;
  }
</style>
