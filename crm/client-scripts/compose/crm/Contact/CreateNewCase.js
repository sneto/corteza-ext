export default {
  label: 'Create new Case from this Contact',
  description: 'Creates a new Case record from and existing Contact',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Contact')
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

      return Compose.makeRecord({
        OwnerId: $record.values.OwnerId,
        Subject: '(no subject)',
        ContactId: $record.recordID,
        AccountId: $record.values.AccountId,
        Status: 'New',
        Priority: 'Low',
        SuppliedName: $record.values.FirstName + ' ' + $record.values.LastName,
        SuppliedEmail: $record.values.Email,
        SuppliedPhone: $record.values.Phone,
        CaseNumber: ('' + nextCaseNumber).padStart(8, '0')
      }, 'Case').then(async myCase => {
        const mySavedCase = await Compose.saveRecord(myCase)
        const nextCaseNumberUpdated = parseInt(nextCaseNumber, 10) + 1

        // Update the config
        settings.values.CaseNextNumber = nextCaseNumberUpdated
        await Compose.saveRecord(settings)

        // Notify current user
        ComposeUI.success('The new case has been created.')

        // Go to the record
        ComposeUI.gotoRecordEditor(mySavedCase)
        return mySavedCase
      })
    })
  }
}
