import React from 'react';
import PropTypes from 'prop-types';
import { BehaviorSubject } from 'rxjs';
import { confirmAsPromise } from '../services/modal';
import { generateHash } from '../utils/utils';
import { get as getLocation } from '../modules/location/location'
import { get as getContact } from '../modules/contact/contact'
import { inputNames, textsCap } from '../modules/identity/IdentityForm';
import { handleSubmit as handleActivitySubmitCb, inputNames as activityInputNames } from '../modules/activity/ActivityForm';
import { query } from '../services/blockchain';

export const getDeloitteId = address => generateHash(`Deloitte.Digital.ID-${address}`);

const DeloitteSignupForm = ({ rxValues, rxInprogress }) => {
  const handleDeloitteSignup = async e => {
    try {
      e.preventDefault();
      const values = rxValues.value;
      const address = values[inputNames.address];
      const name = values[inputNames.name];
      const location = getLocation(values[inputNames.locationId]);
      const contact = getContact(values[inputNames.contactId]);
      const regNum = values[inputNames.registeredNumber];
      const vat = values[inputNames.vatNumber];
      const allow = address && name && location && contact && regNum && vat;

      if (!allow) {
        return await confirmAsPromise({
          cancelButton: textsCap.ok,
          confirmButton: null,
          content: textsCap.deloitteIdSignupNotQualified,
          size: 'mini',
        });
      }

      rxInprogress.next(true);

      const { email, phoneCode, phoneNumber } = contact;
      const phone = phoneCode && phoneNumber ? `${phoneCode}${phoneNumber}` : undefined;
      const hashList = [
        generateHash(address),
        generateHash(name),
        generateHash(location),
        generateHash(phone),
        generateHash(email),
        generateHash(regNum),
        generateHash(vat),
      ];
      const finalHash = generateHash(hashList.join(''));
      const deloitteId = getDeloitteId(address);

      const createActivity = () => new Promise(async resolve => {
        try {
          const exists = await query('api.query.bonsai.isValidRecord', [deloitteId]);
          const activityValues = {
            [activityInputNames.ownerAddress]: address,
            [activityInputNames.name]: 'Placeholder Activity for Deloitte Digital ID',
            [activityInputNames.description]: 'CAUTION: DO NOT UPDATE THIS ACTIVITY.\nUpdating this activity will invalidate your Deloitte Digital ID verification.',
          };
          const activityFormProps = {
            activityId: deloitteId,
            create: !exists,
            onSubmit: success => resolve(!!success),
          };
          const dummyRxState = new BehaviorSubject({});
          await handleActivitySubmitCb(activityFormProps, dummyRxState);
        } catch (error) {
          console.error(error);
          resolve(false);
        }
      });

      await createActivity();
      // Additional logic for handling the signup can be added here

    } catch (error) {
      console.error(error);
    } finally {
      rxInprogress.next(false);
    }
  };

  return (
    <form onSubmit={handleDeloitteSignup}>
      {/* Add form fields and buttons here */}
    </form>
  );
};

DeloitteSignupForm.propTypes = {
  rxValues: PropTypes.object.isRequired,
  rxInprogress: PropTypes.object.isRequired,
};

export default DeloitteSignupForm;