<script>
  export default {
    props: ['annotations'],
    emits: ['next', 'back', 'annotationsChange'],
    created() {
      this.handleNext();
    },
    data() {
      return {
        types: {'highway': ['vehicle', 'path'], 'railway': [], 'power': ['line', 'minor_line']},
        genericTypeSelected: 'highway',
        subtypeSelected: 'vehicle',
        subtypeTyped: '',
        tagsTyped: '',
        currentIndex: -1,
      }
    },
    computed: {
      currentElement() {
        return this.annotations[this.currentIndex];
      }
    },
    methods: {
      handleNext(event) {
        if (this.currentIndex >= 0) {
          // Commit these properties to the global state
          let ann = this.annotations;
          ann[this.currentIndex].genericType = this.genericTypeSelected;
          ann[this.currentIndex].subtype = this.subtypeTyped || this.subtypeSelected;
          if (this.tagsTyped)
            ann[this.currentIndex].tags = [...this.tagsTyped.split(',')];

          this.$emit('annotationsChange', ann);
        }

        this.currentIndex++;

        if (this.currentIndex >= this.annotations.length) {
          this.showAll();
          this.$emit('next');
        } else {
          this.hideAllButOne(this.currentElement);
        }
      },
      handleBack(event) {
        this.showAll();
        this.$emit('back');
      },
      genericTypeChange(event) {
        this.subtypeSelected = this.types[this.genericTypeSelected][0];
      },
      hideAllButOne(hide) {
        let anns = this.annotations;
        for (let i = 0; i < this.annotations.length; i++) {
          anns[i].transparent = (anns[i].name == hide.name) ? false : true;
        }
        this.$emit('annotationsChange', anns);
      },
      showAll() {
        let anns = this.annotations;
        for (let i = 0; i < this.annotations.length; i++) {
          anns[i].transparent = false;
        }
        this.$emit('annotationsChange', anns);
      }
    }
  }
</script>

<template>
  <p>Properties for {{currentElement.name}}</p>
  <div>
    <button @click="handleBack" id="back">Back</button>
    <select v-model="genericTypeSelected" @change="genericTypeChange">
      <option v-for="gType in Object.keys(types)" :value="gType">{{gType}}</option>
    </select>

    <!-- Either displays <select> or <input> depending on the subtypes available -->
    <select v-model="subtypeSelected" v-if="genericTypeSelected && types[genericTypeSelected].length">
      <option v-for="sub in types[genericTypeSelected]" :value="sub">{{sub}}</option>
    </select>
    <input v-model="subtypeTyped" placeholder="Subtype" v-else/>

    <input v-model="tagsTyped" placeholder="Tags: bridge=yes"/>
    <button @click="handleNext" id="next">Next</button>
  </div>
</template>

<style scoped>
  p {
    font-weight: bold;
    font-size: 20px;
    text-align: center;
    margin-bottom: 0.4em;
  }

  select, input {
    width: 10em;
  }

  div {
    display: flex;
    gap: 20px;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>
