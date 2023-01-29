const {Kafka, Partitioners} = require('kafkajs')
const uuid = require('uuid')

const serviceName = process.env.SERVICE_NAME || 'service_TEST'
const schemas = [
  {
    id: 'schema_1',
    multiplier: 1,
  },
  {
    id: 'schema_2'
    multiplier: 2,
  },
  {
    id: 'schema_3'
    multiplier: 3,
  },
]

const otherServiceNames = ['service_A', 'service_B', 'service_C']
  .filter(name => name != serviceName)

const kafka = new Kafka({
  clientId: process.env.SERVICE_NAME || 'test-client-id',
  brokers: [
    'kafka-broker:9092', 
  ],
})

let interval = null

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min) + min)
const generateTime = (size) => Math.floor(
  ((size * getRandomInt(1, 3)) - getRandomInt(size/2, size)) / 10 ** 3
)
const generateRequestMessage = () => {
  const schema = schemas[getRandomInt(0, schemas.length)]
  const mult = schema.multiplier

  const requestSize = getRandomInt(1024 ** mult, 10 * 1024 ** mult)
  const requestSentTime = generateTime(requestSize)
  const responseSize = getRandomInt(1024 ** mult, 5 * 1024 ** mult)
  const responseDownloadTime = generateTime(responseSize)

  return {
    requestId: uuid.v4(),
    schemaId: schema.id,
    clientService: serviceName,
    serverService: otherServiceNames[getRandomInt(0, otherServiceNames.length)],
    requestSize,
    responseSize,
    requestSentTime, // millisecs
    responseDownloadTime, // millisecs
    requestTimestamp: Date.now(), // millisecs
  }
}

const producer = kafka.producer({createPartitioner: Partitioners.LegacyPartitioner})

const start = async () => {
  try {
    await producer.connect()
    console.log('Successfully connected to Kafka.')

    interval = setInterval(async () => {
      const messageQuantity = getRandomInt(1, 100)
      
      const messages = Array(messageQuantity).fill().map(() => ({
        value: JSON.stringify(generateRequestMessage())
      }))
      console.log(messages)
 
      const response = await producer.send({
        topic: 'requests',
        messages,
      })
      console.log(response)
    }, 10000)
  } catch(err) {
    console.error(err)
  }
}

const shutdown = async () => {
  if (interval) {
    clearInterval(interval)
  }

  await producer.disconnect()

  console.log('Successfully disconnected from Kafka.')
}

start()

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

