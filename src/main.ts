import { promises as fs } from 'fs'
import path from 'path'
import * as core from '@actions/core'
import { IncomingWebhook } from '@slack/webhook'
import { Block } from '@slack/types'

interface Section {
  heading: string
  text: string
}

async function run(): Promise<void> {
  try {
    const webhookURL: string = core.getInput('slack-webhook-url')
    const serviceName: string = core.getInput('service-name')
    const repository: string = core.getInput('repository')
    const changelog = await fs.readFile(
      path.resolve(repository, 'docs/CHANGELOG.md'),
      {
        encoding: 'utf-8'
      }
    )

    const chunkRegExp = /^#+ \[*\d+\.\d+\.\d+\]*/gm
    const versionIndexes: number[] = []
    let match

    while ((match = chunkRegExp.exec(changelog)) !== null) {
      versionIndexes.push(match.index)
    }

    const rawContent = changelog.slice(versionIndexes[0], versionIndexes[1])

    console.log('rawContent: ', rawContent)

    const lines = rawContent.split('\n')
    const versionLine = lines.shift()
    const versionAndURLRegExp = /\[(\d+\.\d+\.\d+)\]\(([^)]+)/

    if (!versionLine) {
      return
    }

    const versionLineMatch = versionLine.match(versionAndURLRegExp)

    if (!versionLineMatch) {
      return
    }

    const [, version, versionURL] = versionLineMatch
    const headingRegExp = /### (.+)/gm
    const headingIndexes: number[] = []
    const details = lines.join('\n')

    while ((match = headingRegExp.exec(details)) !== null) {
      headingIndexes.push(match.index)
    }

    const sections: Section[] = headingIndexes.reduce((sum, current, index) => {
      const rawSection = details.slice(current, headingIndexes[index + 1])
      const sectionLines = rawSection.split('\n')
      const sectionHeading = sectionLines.shift() || ''
      const commitsRaw = sectionLines.join('\n').trim()
      const commitRegExp = /- \*\*([^:]+):\*\* ([^(]+) \(\[([^\]]+)\]\(([^)]+)\)/gs
      const commits = []

      while ((match = commitRegExp.exec(commitsRaw)) !== null) {
        if (match) {
          const [, type, message, hash, url] = match

          commits.push({
            type,
            message,
            hash,
            url
          })
        }
      }

      console.log('commits: ', JSON.stringify(commits, null, 2))

      const text = commits.reduce((textSum, commit) => {
        return `${textSum}• *${commit.type}:* ${commit.message.replace(
          /\n/g,
          ''
        )} (<${commit.url}|${commit.hash}>)\n`
      }, '')

      return [
        ...sum,
        {
          heading: sectionHeading.replace('### ', ''),
          text: text.trim()
        }
      ]
    }, [] as Section[])

    console.log('sections: ', JSON.stringify(sections, null, 2))

    const webhook = new IncomingWebhook(webhookURL)

    const payload = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:rocket: New *${serviceName}* release <${versionURL}|v${version}>`
          }
        },
        ...sections.reduce((sum, section) => {
          return [
            ...sum,
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${section.heading}*\n${section.text}`
              }
            }
          ]
        }, [] as Block[])
      ]
    }

    console.log('slack payload: ', JSON.stringify(payload, null, 2))

    await webhook.send(payload)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
