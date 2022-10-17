<script>
  export default {
    props: ['annotations', 'hiddenAnnotations'],
    emits: ['next', 'back', 'annotationsChange', 'hiddenAnnotationsChange'],
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
        blacklisted: this.hiddenAnnotations.slice(0), // Keeps the initial list of annotations that were undone
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

        // Finds the next currentIndex that's not blacklisted
        do {
          this.currentIndex++;
        } while (this.blacklisted.includes(this.currentIndex));

        if (this.currentIndex >= this.annotations.length) {
          this.setHiddenAnnotations(this.blacklisted); // Reset hidden annotations
          this.$emit('next');
        } else {
          // Hides every annotation except for this.currentIndex
          let hidden = [...Array(this.annotations.length).keys()];
          hidden.splice(this.currentIndex, 1);
          this.setHiddenAnnotations(hidden);
        }
      },
      handleBack(event) {
        this.setHiddenAnnotations(this.blacklisted); // Reset hidden annotations
        this.$emit('back');
      },
      genericTypeChange(event) {
        this.subtypeSelected = this.types[this.genericTypeSelected][0];
      },
      setHiddenAnnotations(hide) {
        let hidden = this.hiddenAnnotations;
        hidden = hide;
        this.$emit('hiddenAnnotationsChange', hidden);
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
    <input v-model="subtypeTyped" placeholder="Enter Subtype" v-else/>

    <input v-model="tagsTyped" placeholder="Enter Tags"/>
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
