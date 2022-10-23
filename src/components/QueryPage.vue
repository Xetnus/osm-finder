<script>
import {constructQuery} from '../assets/queryCreator.js'

  export default {
    props: ['annotations', 'programStage'],
    emits: ['programStageChange'],
    data() {
      return {
      }
    },
    methods: {
      back() {
        this.$emit('programStageChange', this.programStage - 1);
      },
      copy() {
        var textArea = document.createElement('textarea');
        textArea.value = document.getElementById('content').textContent;
        document.body.appendChild(textArea);
        textArea.style.top = '5%';
        textArea.style.left = '5%';
        textArea.style.position = 'fixed';
        textArea.style.zIndex = '-1';
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          alert('Copying not supported on this browser.')
        }
        document.body.removeChild(textArea);
      },
      getQuery() {
        return constructQuery(this.annotations);
      }
    }
  }
</script>

<template>
  <div id="popup">
    <a id="close" @click="back()">close</a>
    <a id="copy" @click="copy()">copy</a>
    <pre id="content">{{ getQuery() }}</pre>
  </div>
</template>

<style scoped>
  #popup {
    position: absolute;
    width: 90%;
    height: 90%;
    top: 5%;
    left: 5%;
    padding: 1%;
    background-color: white;
    box-shadow: 0 0 10px 0 black;
  }

  #popup #content {
    width: 100%;
    height: 100%;
    white-space: break-spaces;
    overflow-y: scroll;
  }

  #popup #close {
    position: absolute;
    z-index: 1;
    top: 10px;
    right: 20px;
    font-size: 20px;
    font-weight: bold;
    text-decoration: none;
    color: #333;
    user-select: none;
  }

  #popup #close:hover {
    color: grey;
    cursor: pointer;
  }

  #popup #copy {
    position: absolute;
    z-index: 1;
    top: 50px;
    right: 20px;
    font-size: 20px;
    font-weight: bold;
    text-decoration: none;
    color: #333;
    user-select: none;
  }

  #popup #copy:hover {
    color: grey;
    cursor: pointer;
  }
</style>
