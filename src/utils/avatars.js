import { writeTempFileFromBuffer } from './files'

export const generateAvatar = async (data, filestore) => {
  const jdenticon = require('jdenticon')
  const png = jdenticon.toPng(data, 256)
  const file = await writeTempFileFromBuffer(png)
  return await filestore.copyFromFile({
    ...file,
    name: 'avatar.png',
    type: 'image/png'
  })
}
