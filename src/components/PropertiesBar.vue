<script>
  export default {
    props: ['annotations', 'propertiesHistory'],
    emits: ['next', 'back', 'annotationsChange', 'propertiesHistoryChange'],
    beforeMount() {
      if (this.propertiesHistory == -1) {
        this.handleNext();
      } else {
        this.currentIndex = this.propertiesHistory;
        this.handleBack();
      }
    },
    data() {
      return {
        types: {'highway': ['vehicle', 'path'], 'railway': [], 'power': ['line', 'minor_line']},
        defaults: {genericTypeSelected: 'highway', subtypeSelected: 'vehicle', subtypeTyped: '', tagsTyped: ''},
        genericTypeSelected: null,
        subtypeSelected: null,
        subtypeTyped: null,
        tagsTyped: null,
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
          ann[this.currentIndex].subtype = this.subtypeSelected || this.subtypeTyped;
          if (this.tagsTyped)
            ann[this.currentIndex].tags = [...this.tagsTyped.split(',')];

          this.$emit('annotationsChange', ann);
        }

        if (this.currentIndex >= this.annotations.length - 1) {
          this.showAll();
          this.$emit('propertiesHistoryChange', this.currentIndex + 1);
          this.$emit('next');
        } else {
          this.currentIndex++;
          this.fillInForm();
          this.hideAllButOne(this.currentElement);
        }
      },

      handleBack(event) {
        if (this.currentIndex == 0) {
          this.showAll();
          this.$emit('propertiesHistoryChange', -1);
          this.$emit('back');
        } else {
          this.currentIndex--;
          this.fillInForm();
          this.hideAllButOne(this.currentElement);
        }
      },

      fillInForm() {
        // Initializes the inputs to the defaults or, if data has already been stored
        // for this relation, fills that data in.
        const a = this.annotations[this.currentIndex];
        this.genericTypeSelected = a.genericType || this.defaults.genericTypeSelected;
        if (this.types[[this.genericTypeSelected]].length == 0) {
          this.subtypeTyped = a.subtype || this.defaults.subtypeTyped;
        } else {
          this.subtypeSelected = a.subtype || this.defaults.subtypeSelected;
        }
        this.tagsTyped = a.tags.join(',') || this.defaults.tagsTyped;
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
      },

      genericTypeChange(event) {
        this.subtypeSelected = this.types[this.genericTypeSelected][0];
      },
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
