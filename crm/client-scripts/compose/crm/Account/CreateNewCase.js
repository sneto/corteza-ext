export default {
  label: 'Create new Case from this Account',
  description: 'Creates new Case record from an existing Account',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Account')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Get the default settings
    return Compose.findLastRecord('Settings').then(settings => {
      // Map the case number
      let nextCaseNumber = settings.values.CaseNextNumber
      if (!nextCaseNumber || isNaN(nextCaseNumber)) {
        nextCaseNumber = 0
      }

      // Find the contact we want to link the new case to (by default, the primary contact)
      return Compose.findRecords(`AccountId = ${$record.recordID}`, 'Contact')
        .catch(() => ({ set: [] }))
        .then(({ set }) => {
          let ContactId, SuppliedName, SuppliedEmail, SuppliedPhone

          // Loop through the contacts of the account, to save the primary contact
          set.forEach(r => {
            // Check if it's the primary contact
            const contactIsPrimary = r.values.IsPrimary
            if (contactIsPrimary === '1') {
              // Add the contact
              ContactId = r.recordID
              SuppliedName = r.values.FirstName + ' ' + r.values.LastName
              SuppliedEmail = r.values.Email
              SuppliedPhone = r.values.Phone
            }
          })

        return Compose.makeRecord({
          OwnerId: $record.values.OwnerId,
          Subject: '(no subject)',
          ContactId: ContactId,
          AccountId: $record.recordID,
          Status: 'New',
          Priority: 'Low',
          SuppliedName: SuppliedName,
          SuppliedEmail: SuppliedEmail,
          SuppliedPhone: SuppliedPhone,
          CaseNumber: ('' + nextCaseNumber).padStart(8, '0')
        }, 'Case')
          .then(async myCase => {
            // Save new Case record
            const mySavedCase = await Compose.saveRecord(myCase)

            // Update the config
            const nextCaseNumberUpdated = parseInt(nextCaseNumber, 10) + 1
            settings.values.CaseNextNumber = nextCaseNumberUpdated
            await Compose.saveRecord(settings)

            // Notify current user
            ComposeUI.success('The new case has been created.')

            // Go to the record
            ComposeUI.gotoRecordEditor(mySavedCase)

            return mySavedCase
          })
      })
    })
  }
}
