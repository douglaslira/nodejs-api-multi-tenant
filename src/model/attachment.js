const schema = {
  uuid: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  originalFileSize: {
    type: Number,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  description: {
    type: String
  }
}

export default schema
